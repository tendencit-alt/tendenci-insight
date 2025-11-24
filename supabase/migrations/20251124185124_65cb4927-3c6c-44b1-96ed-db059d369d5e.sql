-- Atualizar limite de tamanho dos buckets de storage para 100MB

-- Atualizar bucket project-files para 100MB (104857600 bytes)
UPDATE storage.buckets
SET file_size_limit = 104857600
WHERE name = 'project-files';

-- Atualizar bucket deal-files para 100MB (104857600 bytes)
UPDATE storage.buckets
SET file_size_limit = 104857600
WHERE name = 'deal-files';