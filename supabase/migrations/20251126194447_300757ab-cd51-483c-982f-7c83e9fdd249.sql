-- Aumentar limite de tamanho de arquivo para 1GB (1073741824 bytes) em todos os buckets de storage
UPDATE storage.buckets 
SET file_size_limit = 1073741824 
WHERE id IN (
  'crm-files',
  'deal-files', 
  'client-files',
  'crm-timeline-attachments',
  'architect-files',
  'project-files',
  'lead-attachments'
);