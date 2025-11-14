-- Adicionar políticas RLS para permitir inserção inicial de progresso
-- Permitir que admins criem registros de progresso inicial
CREATE POLICY "Admins podem criar progresso inicial"
ON tendenci_goal_progress
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Permitir que o sistema (trigger) atualize progresso
CREATE POLICY "Sistema atualiza progresso"
ON tendenci_goal_progress
FOR UPDATE
TO authenticated
USING (true);
