-- Scope document/chunk RLS to authenticated role with explicit WITH CHECK (Supabase-recommended pattern).

DROP POLICY IF EXISTS "Users see own documents" ON documents;

CREATE POLICY "documents_authenticated_all"
  ON documents
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own chunks" ON chunks;

CREATE POLICY "chunks_authenticated_all"
  ON chunks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = chunks.document_id
        AND documents.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = chunks.document_id
        AND documents.user_id = auth.uid()
    )
  );
