
-- Corrigir a policy de SELECT para permitir que usuários com permissão ia_configuracao vejam TODOS os produtos
-- (não apenas os ativos)

-- Primeiro, remover a policy atual de leitura pública
DROP POLICY IF EXISTS "Leitura publica de produtos ativos" ON public.tendenci_ia_produtos;

-- Criar nova policy: Leitura pública apenas para produtos ativos
CREATE POLICY "Leitura publica de produtos ativos"
ON public.tendenci_ia_produtos
FOR SELECT
USING (
  ativo = true
  OR 
  -- Admins podem ver todos
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR
  -- Usuários com permissão ia_configuracao podem ver todos (para gerenciar)
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_permissions.user_id = auth.uid()
    AND user_permissions.module = 'ia_configuracao'
    AND user_permissions.can_view = true
  )
);
