import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseDocument } from "@/lib/parsing";
import { chunkText } from "@/lib/chunking";
import { getEmbeddings } from "@/lib/embeddings";
import { captureException } from "@/lib/sentry";

type Params = { params: { id: string } };

const EMBEDDING_BATCH_SIZE = 100;

async function updateProcessingProgress(
  documentId: string,
  stage: string,
  current = 0,
  total = 0
) {
  const admin = createAdminClient();
  await admin
    .from("documents")
    .update({
      metadata: {
        progress: { stage, current, total },
      },
    })
    .eq("id", documentId);
}

export async function POST(request: Request, { params }: Params) {
  const documentId = params.id;
  const admin = createAdminClient();

  const internalKey = request.headers.get("x-internal-key");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isInternal = internalKey && internalKey === process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isInternal && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: document, error: docError } = await admin
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (docError || !document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
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
    if (!parsed.text.trim()) throw new Error("Parsed text is empty");

    await updateProcessingProgress(documentId, "chunking", 0, 0);
    const chunks = chunkText(parsed.text);
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
          progress: { stage: "ready", current: chunkRows.length, total: chunkRows.length },
        },
      })
      .eq("id", documentId);
    if (doneError) throw new Error(doneError.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    captureException(error, { documentId });
    await admin
      .from("documents")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        metadata: {
          progress: { stage: "failed", current: 0, total: 0 },
        },
      })
      .eq("id", documentId);

    return NextResponse.json({ error: "Failed to process document" }, { status: 500 });
  }
}
