-- Remover políticas duplicadas/conflitantes do bucket project-files
-- Mantendo apenas as políticas com role 'authenticated'

DROP POLICY IF EXISTS "Autenticados podem visualizar arquivos de projetos" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados podem fazer upload de arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados podem deletar arquivos de projetos" ON storage.objects;