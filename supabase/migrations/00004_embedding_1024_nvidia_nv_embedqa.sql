-- Use 1024-d vectors for NVIDIA hosted embeddings (e.g. nvidia/nv-embedqa-e5-v5).
-- OpenAI model names like text-embedding-3-small are not served at integrate.api.nvidia.com.
-- Existing chunk vectors are removed; re-upload or re-run processing for each document after this migration.

DELETE FROM chunks;

DROP INDEX IF EXISTS chunks_embedding_idx;

ALTER TABLE chunks
  ALTER COLUMN embedding TYPE vector(1024);

CREATE INDEX chunks_embedding_idx ON chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1024),
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
