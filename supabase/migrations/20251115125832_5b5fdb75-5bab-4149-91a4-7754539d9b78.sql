-- Criar bucket para arquivos de deals se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deal-files',
  'deal-files',
  false,
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para o bucket deal-files
CREATE POLICY "Autenticados podem fazer upload de arquivos de deals"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'deal-files');

CREATE POLICY "Autenticados podem ver arquivos de deals"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'deal-files');

CREATE POLICY "Autenticados podem deletar arquivos de deals"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'deal-files');