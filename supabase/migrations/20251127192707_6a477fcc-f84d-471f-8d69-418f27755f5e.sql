-- Criar bucket architect-timeline com limite de 1GB se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'architect-timeline',
  'architect-timeline',
  false,
  1073741824, -- 1GB em bytes
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroenabled.12',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    'image/vnd.dwg',
    'application/acad',
    'application/x-acad',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'audio/mpeg',
    'audio/wav',
    'audio/x-m4a',
    'audio/webm',
    'audio/ogg',
    'application/vnd.sketchup.skp',
    'application/x-sketchup',
    'model/vnd.sketchup.skp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 1073741824,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Criar bucket crm-timeline com limite de 1GB se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crm-timeline',
  'crm-timeline',
  false,
  1073741824, -- 1GB em bytes
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroenabled.12',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    'image/vnd.dwg',
    'application/acad',
    'application/x-acad',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'audio/mpeg',
    'audio/wav',
    'audio/x-m4a',
    'audio/webm',
    'audio/ogg',
    'application/vnd.sketchup.skp',
    'application/x-sketchup',
    'model/vnd.sketchup.skp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 1073741824,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Criar políticas RLS para architect-timeline bucket
CREATE POLICY "Usuários autenticados podem fazer upload em architect-timeline"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'architect-timeline');

CREATE POLICY "Usuários autenticados podem visualizar architect-timeline"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'architect-timeline');

CREATE POLICY "Usuários autenticados podem deletar de architect-timeline"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'architect-timeline');

-- Criar políticas RLS para crm-timeline bucket
CREATE POLICY "Usuários autenticados podem fazer upload em crm-timeline"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'crm-timeline');

CREATE POLICY "Usuários autenticados podem visualizar crm-timeline"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'crm-timeline');

CREATE POLICY "Usuários autenticados podem deletar de crm-timeline"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'crm-timeline');