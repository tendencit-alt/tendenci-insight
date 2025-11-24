-- Adicionar versão lowercase do MIME type para arquivos .xlsm
-- O Supabase Storage valida em lowercase, então precisamos da versão minúscula
UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'application/vnd.ms-excel.sheet.macroenabled.12')
WHERE id = 'project-files'
AND NOT ('application/vnd.ms-excel.sheet.macroenabled.12' = ANY(allowed_mime_types));