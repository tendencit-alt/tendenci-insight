-- Garantir que a função RPC possa ser executada por usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_seller_performance_by_goal(UUID) TO authenticated;

-- Remover políticas antigas se existirem e criar novas
DROP POLICY IF EXISTS "Admins podem ler metas de qualquer vendedor" ON tendenci_seller_goals;
DROP POLICY IF EXISTS "Admins podem ler progresso de qualquer meta" ON tendenci_goal_progress;

-- Adicionar política para permitir que admins leiam dados de qualquer vendedor
CREATE POLICY "Admins podem ler metas de qualquer vendedor"
ON tendenci_seller_goals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Adicionar política para admins lerem o progresso
CREATE POLICY "Admins podem ler progresso de qualquer meta"
ON tendenci_goal_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);