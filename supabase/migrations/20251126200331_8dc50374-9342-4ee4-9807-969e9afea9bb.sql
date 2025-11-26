-- Adicionar MIME type para Excel com macros (.xlsm) em todos os buckets
UPDATE storage.buckets 
SET allowed_mime_types = array_append(
  COALESCE(allowed_mime_types, ARRAY[]::text[]),
  'application/vnd.ms-excel.sheet.macroenabled.12'
)
WHERE id IN (
  'crm-files',
  'deal-files', 
  'client-files',
  'crm-timeline-attachments',
  'architect-files',
  'project-files',
  'lead-attachments'
) AND NOT ('application/vnd.ms-excel.sheet.macroenabled.12' = ANY(COALESCE(allowed_mime_types, ARRAY[]::text[])));