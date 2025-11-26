-- Fase 1: Atualizar configuração de buckets com mime types corretos e consistentes
-- Incluir todos os tipos de arquivo permitidos: PDF, DOC, DOCX, XLS, XLSX, XLSM, DWG, 
-- JPG, JPEG, PNG, WEBP, TXT, MP3, WAV, M4A, WEBM, OGG

-- Atualizar deal-files bucket
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
  'audio/ogg'
]
WHERE id = 'deal-files';

-- Atualizar architect-files bucket
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
  'audio/ogg'
]
WHERE id = 'architect-files';

-- Atualizar crm-timeline-attachments bucket
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
  'audio/ogg'
]
WHERE id = 'crm-timeline-attachments';

-- Atualizar client-files bucket
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
  'audio/ogg'
]
WHERE id = 'client-files';

-- Atualizar crm-files bucket
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
  'audio/ogg'
]
WHERE id = 'crm-files';

-- Atualizar project-files bucket
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
  'audio/ogg'
]
WHERE id = 'project-files';

-- Atualizar lead-attachments bucket
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
  'audio/ogg'
]
WHERE id = 'lead-attachments';