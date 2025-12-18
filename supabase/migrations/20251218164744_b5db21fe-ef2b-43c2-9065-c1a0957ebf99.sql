-- Atualizar TODOS os buckets adicionando application/octet-stream para arquivos .skp e outros não reconhecidos
UPDATE storage.buckets 
SET allowed_mime_types = array_cat(
  COALESCE(allowed_mime_types, ARRAY[]::text[]), 
  ARRAY['application/octet-stream', 'image/jpg', 'image/x-dwg', 'application/dwg', 'application/x-dwg']::text[]
)
WHERE id IN (
  SELECT id FROM storage.buckets 
  WHERE allowed_mime_types IS NOT NULL
);

-- Para buckets sem restrição de MIME type, adicionar lista completa
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroenabled.12',
  'application/octet-stream',
  'application/dwg',
  'application/x-dwg',
  'application/acad',
  'application/x-acad',
  'application/vnd.sketchup.skp',
  'application/x-sketchup',
  'model/vnd.sketchup.skp',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/dwg',
  'image/x-dwg',
  'text/plain',
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/webm',
  'audio/ogg'
]::text[]
WHERE allowed_mime_types IS NULL;