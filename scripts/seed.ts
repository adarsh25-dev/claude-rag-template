import { createClient } from "@supabase/supabase-js";
import { parseDocument } from "../lib/parsing";
import { chunkText } from "../lib/chunking";
import { getEmbeddings } from "../lib/embeddings";

type SeedDoc = {
  title: string;
  filename: string;
  mimeType: string;
  url: string;
};

const SEED_USER_ID = "00000000-0000-0000-0000-000000000000";

const seedDocs: SeedDoc[] = [
  {
    title: "Attention Is All You Need",
    filename: "attention-is-all-you-need.pdf",
    mimeType: "application/pdf",
    url: "https://arxiv.org/pdf/1706.03762.pdf",
  },
  {
    title: "RAG Survey",
    filename: "rag-survey.pdf",
    mimeType: "application/pdf",
    url: "https://arxiv.org/pdf/2312.10997.pdf",
  },
  {
    title: "Prompt Engineering Guide",
    filename: "prompt-engineering-guide.pdf",
    mimeType: "application/pdf",
    url: "https://arxiv.org/pdf/2401.14423.pdf",
  },
];

async function seed() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Missing Supabase env vars for seed script.");
  }

  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const doc of seedDocs) {
    console.log(`Seeding ${doc.title}...`);
    const response = await fetch(doc.url);
    if (!response.ok) throw new Error(`Failed to download ${doc.url}`);
    const buffer = Buffer.from(await response.arrayBuffer());

    const documentId = crypto.randomUUID();
    const storagePath = `${SEED_USER_ID}/${documentId}.pdf`;

    const { error: storageError } = await supabase.storage.from("documents").upload(storagePath, buffer, {
      contentType: doc.mimeType,
      upsert: true,
    });
    if (storageError) throw storageError;

    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({
        id: documentId,
        user_id: SEED_USER_ID,
        title: doc.title,
        filename: doc.filename,
        file_size: buffer.byteLength,
        file_type: doc.mimeType,
        status: "processing",
        metadata: { storage_path: storagePath, seeded: true },
      })
      .select("*")
      .single();
    if (insertError || !document) throw insertError ?? new Error("Insert failed");

    const parsed = await parseDocument(buffer, doc.mimeType);
    const chunks = chunkText(parsed.text);

    const rows: Array<{
      document_id: string;
      content: string;
      chunk_index: number;
      token_count: number;
      embedding: string;
      metadata: Record<string, unknown>;
    }> = [];

    for (let i = 0; i < chunks.length; i += 100) {
      const batch = chunks.slice(i, i + 100);
      const embeddings = await getEmbeddings(batch.map((chunk) => chunk.content));
      batch.forEach((chunk, idx) => {
        rows.push({
          document_id: documentId,
          content: chunk.content,
          chunk_index: chunk.chunkIndex,
          token_count: chunk.tokenCount,
          embedding: JSON.stringify(embeddings[idx]),
          metadata: { seeded: true },
        });
      });
    }

    const { error: chunkError } = await supabase.from("chunks").insert(rows);
    if (chunkError) throw chunkError;

    await supabase
      .from("documents")
      .update({
        status: "ready",
        metadata: {
          storage_path: storagePath,
          seeded: true,
          chunk_count: rows.length,
          page_count: parsed.pageCount ?? null,
        },
      })
      .eq("id", documentId);

    console.log(`Seeded ${doc.title} (${rows.length} chunks)`);
  }

  console.log("Seed complete.");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
