import { createAdminClient } from "@/lib/supabase/admin";
import { parseDocument } from "@/lib/parsing";
import { chunkText } from "@/lib/chunking";
import { getEmbeddings } from "@/lib/embeddings";
import { captureException } from "@/lib/sentry";

const EMBEDDING_BATCH_SIZE = 100;
const DEFAULT_RAG_CHUNK_SIZE = 800;
const DEFAULT_RAG_OVERLAP = 200;
const DEFAULT_EMBEDDING_MAX_INPUT_TOKENS = 512;

function getEmbeddingMaxInputTokens(): number {
  const raw = process.env.NVIDIA_EMBEDDING_MAX_INPUT_TOKENS;
  if (raw === undefined || raw.trim() === "") return DEFAULT_EMBEDDING_MAX_INPUT_TOKENS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 128) return DEFAULT_EMBEDDING_MAX_INPUT_TOKENS;
  return parsed;
}

function getChunkingOptionsForEmbeddings(): { chunkSize: number; overlap: number } {
  const maxInputTokens = getEmbeddingMaxInputTokens();
  // Keep a margin for tokenizer mismatch between local estimator and provider tokenizer.
  const safetyMargin = 64;
  const embeddingSafeChunkSize = Math.max(128, maxInputTokens - safetyMargin);
  const chunkSize = Math.min(DEFAULT_RAG_CHUNK_SIZE, embeddingSafeChunkSize);
  const overlap = Math.min(DEFAULT_RAG_OVERLAP, Math.max(32, Math.floor(chunkSize / 4)));
  return { chunkSize, overlap };
}

function asMetadataRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

async function updateProcessingProgress(
  documentId: string,
  stage: string,
  current = 0,
  total = 0
) {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("documents")
    .select("metadata")
    .eq("id", documentId)
    .single();

  const prev = asMetadataRecord(row?.metadata);

  await admin
    .from("documents")
    .update({
      metadata: {
        ...prev,
        progress: { stage, current, total },
      },
    })
    .eq("id", documentId);
}

export type ProcessDocumentResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Download from storage, parse, chunk, embed, insert chunks, set document to ready.
 * On failure updates row to failed (only while status is still `processing`) unless another run already set ready.
 */
export async function processDocumentById(documentId: string): Promise<ProcessDocumentResult> {
  const admin = createAdminClient();

  const { data: document, error: docError } = await admin
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (docError || !document) {
    return { success: false, error: "Document not found" };
  }

  if (document.status === "ready") {
    return { success: true };
  }

  try {
    const storagePath = String((document.metadata as { storage_path?: string })?.storage_path ?? "");
    if (!storagePath) throw new Error("Missing storage path in metadata");

    await updateProcessingProgress(documentId, "downloading", 0, 0);
    const { data: fileData, error: downloadError } = await admin.storage
      .from("documents")
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message ?? "Failed to download source file");
    }

    await updateProcessingProgress(documentId, "parsing", 0, 0);
    const fileBuffer = Buffer.from(await fileData.arrayBuffer());
    const parsed = await parseDocument(fileBuffer, document.file_type);
    if (!parsed.text.trim()) {
      throw new Error("No extractable text after parsing (unexpected empty result).");
    }

    await updateProcessingProgress(documentId, "chunking", 0, 0);
    const chunkingOptions = getChunkingOptionsForEmbeddings();
    const chunks = chunkText(parsed.text, chunkingOptions);
    if (!chunks.length) throw new Error("No chunks generated");

    const chunkRows: Array<{
      document_id: string;
      content: string;
      chunk_index: number;
      token_count: number;
      embedding: string;
      metadata: Record<string, unknown>;
    }> = [];

    for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
      await updateProcessingProgress(documentId, "embedding", i, chunks.length);
      const embeddings = await getEmbeddings(batch.map((chunk) => chunk.content));
      for (let index = 0; index < batch.length; index++) {
        const chunk = batch[index];
        chunkRows.push({
          document_id: documentId,
          content: chunk.content,
          chunk_index: chunk.chunkIndex,
          token_count: chunk.tokenCount,
          embedding: JSON.stringify(embeddings[index]),
          metadata: {
            page_count: parsed.pageCount ?? null,
            chunking: {
              chunk_size: chunkingOptions.chunkSize,
              overlap: chunkingOptions.overlap,
              embedding_max_input_tokens: getEmbeddingMaxInputTokens(),
            },
          },
        });
      }
    }

    await updateProcessingProgress(documentId, "storing", chunkRows.length, chunkRows.length);
    const { error: chunksError } = await admin.from("chunks").insert(chunkRows);
    if (chunksError) throw new Error(chunksError.message);

    const { error: doneError } = await admin
      .from("documents")
      .update({
        status: "ready",
        error_message: null,
        metadata: {
          storage_path: storagePath,
          page_count: parsed.pageCount ?? null,
          chunk_count: chunkRows.length,
          chunking: {
            chunk_size: chunkingOptions.chunkSize,
            overlap: chunkingOptions.overlap,
            embedding_max_input_tokens: getEmbeddingMaxInputTokens(),
          },
          progress: { stage: "ready", current: chunkRows.length, total: chunkRows.length },
        },
      })
      .eq("id", documentId);
    if (doneError) throw new Error(doneError.message);

    return { success: true };
  } catch (error) {
    captureException(error, { documentId });

    const { data: latest } = await admin
      .from("documents")
      .select("status")
      .eq("id", documentId)
      .single();

    if (latest?.status === "ready") {
      return { success: true };
    }

    const { data: failedRow } = await admin
      .from("documents")
      .select("metadata")
      .eq("id", documentId)
      .single();
    const failedPrev = asMetadataRecord(failedRow?.metadata);

    const message = error instanceof Error ? error.message : "Unknown error";

    const { error: failUpdateError } = await admin
      .from("documents")
      .update({
        status: "failed",
        error_message: message,
        metadata: {
          ...failedPrev,
          progress: { stage: "failed", current: 0, total: 0 },
        },
      })
      .eq("id", documentId)
      .eq("status", "processing");

    if (failUpdateError) {
      captureException(failUpdateError, { documentId, phase: "mark-failed" });
    }

    return { success: false, error: message };
  }
}
