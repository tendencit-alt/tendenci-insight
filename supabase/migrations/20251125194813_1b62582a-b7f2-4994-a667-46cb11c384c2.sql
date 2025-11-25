-- Atualizar buckets para aceitar 100MB (104857600 bytes)
UPDATE storage.buckets SET file_size_limit = 104857600 WHERE id = 'client-files';
UPDATE storage.buckets SET file_size_limit = 104857600 WHERE id = 'crm-files';
UPDATE storage.buckets SET file_size_limit = 104857600 WHERE id = 'lead-attachments';
UPDATE storage.buckets SET file_size_limit = 104857600 WHERE id = 'architect-files';
UPDATE storage.buckets SET file_size_limit = 104857600 WHERE id = 'crm-timeline-attachments';