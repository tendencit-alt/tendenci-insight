-- Atualizar MIME types permitidos no bucket production-attachments
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  -- Imagens
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
  -- Áudio
  'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/m4a',
  -- PDFs
  'application/pdf',
  -- Word (incluindo formato antigo)
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  -- Excel (incluindo formato antigo)
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroenabled.12',
  -- CAD e SketchUp
  'application/octet-stream',
  'image/x-dwg', 'application/dwg', 'application/x-dwg',
  'application/vnd.sketchup.skp', 'application/x-sketchup', 'model/vnd.sketchup.skp',
  -- Texto
  'text/plain'
]
WHERE id = 'production-attachments';