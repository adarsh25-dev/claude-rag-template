import { getEmbedding } from "./embeddings";
import { createAdminClient } from "./supabase/admin";
import { Database } from "@/types/database";

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  content: string;
  similarity: number;
  chunkIndex: number;
  metadata: Database["public"]["Tables"]["chunks"]["Row"]["metadata"];
  documentTitle?: string;
  filename?: string;
}

type MatchChunksRow = Database["public"]["Functions"]["match_chunks"]["Returns"][number];

export async function retrieveChunks(
  query: string,
  options: {
    documentIds?: string[];
    topK?: number;
    threshold?: number;
    userId?: string;
  } = {}
): Promise<RetrievedChunk[]> {
  const { userId, documentIds, topK = 5, threshold = 0.7 } = options;
  if (!userId) throw new Error("userId is required for retrieval");

  const embedding = await getEmbedding(query);
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: JSON.stringify(embedding),
    match_threshold: threshold,
    match_count: topK,
    filter_user_id: userId || null,
    filter_document_ids: documentIds?.length ? documentIds : null,
  });

  if (error) {
    console.error("Retrieval error:", error);
    throw new Error("Failed to retrieve chunks");
  }

  const rows: RetrievedChunk[] = (data || []).map((row: MatchChunksRow) => ({
    chunkId: row.id,
    documentId: row.document_id,
    content: row.content,
    similarity: row.similarity,
    chunkIndex: row.chunk_index,
    metadata: row.metadata,
  }));

  const docIds = Array.from(new Set(rows.map((row: RetrievedChunk) => row.documentId)));
  const { data: docs } = await supabase
    .from("documents")
    .select("id,title,filename")
    .in("id", docIds);
  const docMap = new Map((docs || []).map((doc) => [doc.id, doc]));

  return rows.map((row) => ({
    ...row,
    documentTitle: docMap.get(row.documentId)?.title,
    filename: docMap.get(row.documentId)?.filename,
  }));
}
