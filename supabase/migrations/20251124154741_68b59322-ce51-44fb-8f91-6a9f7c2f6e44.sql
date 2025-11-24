-- Criar políticas RLS para o bucket project-files no storage

-- Política para permitir usuários autenticados fazerem upload de arquivos
CREATE POLICY "Usuários autenticados podem fazer upload de arquivos de projeto"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files');

-- Política para permitir usuários autenticados visualizarem/baixarem arquivos
CREATE POLICY "Usuários autenticados podem ver arquivos de projeto"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'project-files');

-- Política para permitir usuários autenticados atualizarem arquivos
CREATE POLICY "Usuários autenticados podem atualizar arquivos de projeto"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'project-files')
WITH CHECK (bucket_id = 'project-files');

-- Política para permitir usuários autenticados deletarem arquivos
CREATE POLICY "Usuários autenticados podem deletar arquivos de projeto"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'project-files');

-- Criar políticas para a tabela project_files
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_files' 
    AND policyname = 'Usuários autenticados podem inserir arquivos'
  ) THEN
    CREATE POLICY "Usuários autenticados podem inserir arquivos"
    ON project_files
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_files' 
    AND policyname = 'Usuários autenticados podem ver arquivos'
  ) THEN
    CREATE POLICY "Usuários autenticados podem ver arquivos"
    ON project_files
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_files' 
    AND policyname = 'Usuários autenticados podem deletar arquivos'
  ) THEN
    CREATE POLICY "Usuários autenticados podem deletar arquivos"
    ON project_files
    FOR DELETE
    TO authenticated
    USING (true);
  END IF;
END $$;