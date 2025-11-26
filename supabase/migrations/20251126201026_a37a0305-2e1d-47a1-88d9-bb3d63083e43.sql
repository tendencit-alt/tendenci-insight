-- Add SketchUp (.skp) MIME types to storage buckets
UPDATE storage.buckets 
SET allowed_mime_types = array_cat(
  COALESCE(allowed_mime_types, ARRAY[]::text[]),
  ARRAY[
    'application/vnd.sketchup.skp',
    'application/x-sketchup',
    'model/vnd.sketchup.skp'
  ]::text[]
)
WHERE id IN (
  'crm-files',
  'deal-files', 
  'client-files',
  'crm-timeline-attachments',
  'architect-files',
  'project-files',
  'lead-attachments'
) AND NOT (
  'application/vnd.sketchup.skp' = ANY(COALESCE(allowed_mime_types, ARRAY[]::text[]))
);