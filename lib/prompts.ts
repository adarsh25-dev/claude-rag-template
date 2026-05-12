import { RetrievedChunk } from "./retrieval";

export interface Chunk {
  content: string;
  chunkIndex: number;
}

export function buildRAGPrompt(query: string, chunks: RetrievedChunk[]): {
  system: string;
  user: string;
} {
  const systemPrompt =
    "You are a helpful AI assistant. Answer the user's question using ONLY the provided context. If the context doesn't contain the answer, say so. Always cite sources using [source N] notation.";

  const contextStr = chunks
    .map((chunk, i) => `${chunk.content}\n[source ${i + 1}]`)
    .join("\n\n");

  const userPrompt = `Context:\n${contextStr}\n\nQuestion: ${query}`;

  return {
    system: systemPrompt,
    user: userPrompt,
  };
}
