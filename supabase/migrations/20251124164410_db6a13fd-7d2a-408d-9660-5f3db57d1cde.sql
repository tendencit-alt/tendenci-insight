-- Atualizar bucket project-files para aceitar Excel e DWG
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  -- PDF
  'application/pdf',
  
  -- Imagens
  'image/png',
  'image/jpeg', 
  'image/jpg',
  'image/webp',
  
  -- Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  
  -- Excel (.xlsx, .xls)
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  
  -- DWG/CAD (diversos MIME types para compatibilidade)
  'application/acad',
  'application/x-acad',
  'application/autocad_dwg',
  'application/dwg',
  'application/x-dwg',
  'image/x-dwg',
  'image/vnd.dwg',
  'drawing/dwg',
  
  -- Texto
  'text/plain',
  
  -- Áudio
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/x-m4a',
  'audio/m4a',
  'audio/webm',
  'audio/ogg'
]
WHERE id = 'project-files';