-- Adicionar suporte para arquivos Excel com macros (.xlsm) no bucket project-files
UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'application/vnd.ms-excel.sheet.macroEnabled.12')
WHERE id = 'project-files'
AND NOT ('application/vnd.ms-excel.sheet.macroEnabled.12' = ANY(allowed_mime_types));