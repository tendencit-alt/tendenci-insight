-- Criar bucket de storage para arquivos de arquitetos
INSERT INTO storage.buckets (id, name, public)
VALUES ('architect-files', 'architect-files', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para arquivos de arquitetos
CREATE POLICY "Autenticados podem visualizar arquivos de arquitetos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'architect-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem fazer upload de arquivos de arquitetos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'architect-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar arquivos de arquitetos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'architect-files' AND auth.uid() IS NOT NULL);