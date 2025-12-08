-- Add missing audio MIME types for iOS/Safari compatibility
UPDATE storage.buckets 
SET allowed_mime_types = array_cat(
  COALESCE(allowed_mime_types, ARRAY[]::text[]),
  ARRAY['audio/mp4', 'audio/aac', 'audio/3gpp', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/wav']::text[]
)
WHERE name IN ('crm-files', 'architect-files', 'project-files')
AND NOT (COALESCE(allowed_mime_types, ARRAY[]::text[]) @> ARRAY['audio/mp4']::text[]);