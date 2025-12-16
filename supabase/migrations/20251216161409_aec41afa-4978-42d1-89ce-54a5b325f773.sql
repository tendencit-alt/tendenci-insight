-- Criar bucket para anexos de produção
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'production-attachments',
  'production-attachments',
  true,
  104857600, -- 100MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/m4a',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroenabled.12',
    'application/octet-stream'
  ]
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies para o bucket
CREATE POLICY "production_attachments_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'production-attachments');

CREATE POLICY "production_attachments_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'production-attachments');

CREATE POLICY "production_attachments_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'production-attachments');