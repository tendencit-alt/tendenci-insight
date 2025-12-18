-- Dropar política antiga de DELETE (se existir)
DROP POLICY IF EXISTS "Admins podem deletar entradas da timeline" ON architect_timeline;

-- Criar nova política: autor OU admin pode deletar
CREATE POLICY "Autor ou admin podem deletar entradas da timeline"
ON architect_timeline
FOR DELETE
USING (
  auth.uid() = author_id 
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Dropar política antiga de UPDATE (se existir)
DROP POLICY IF EXISTS "Autores podem atualizar suas próprias entradas" ON architect_timeline;

-- Criar nova política: autor OU admin pode atualizar
CREATE POLICY "Autor ou admin podem atualizar entradas da timeline"
ON architect_timeline
FOR UPDATE
USING (
  auth.uid() = author_id 
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);