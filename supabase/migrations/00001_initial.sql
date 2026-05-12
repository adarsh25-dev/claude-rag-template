-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  filename text NOT NULL,
  file_size int NOT NULL,
  file_type text NOT NULL,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','ready','failed')),
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Chunks with embeddings
CREATE TABLE chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content text NOT NULL,
  chunk_index int NOT NULL,
  token_count int NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Index for fast vector search
CREATE INDEX chunks_embedding_idx ON chunks 
  USING hnsw (embedding vector_cosine_ops);

-- Index for filtering by document
CREATE INDEX chunks_document_idx ON chunks(document_id);

-- RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own documents" ON documents
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own chunks" ON chunks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = chunks.document_id 
      AND documents.user_id = auth.uid()
    )
  );

-- RPC function for semantic search
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_user_id uuid DEFAULT NULL,
  filter_document_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float,
  chunk_index int,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.document_id,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity,
    c.chunk_index,
    c.metadata
  FROM chunks c
  INNER JOIN documents d ON d.id = c.document_id
  WHERE 
    (filter_user_id IS NULL OR d.user_id = filter_user_id)
    AND (filter_document_ids IS NULL OR c.document_id = ANY(filter_document_ids))
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
