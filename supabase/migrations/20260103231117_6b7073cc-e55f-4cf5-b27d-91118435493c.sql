-- Adicionar política para permitir usuários com permissão ia_configuracao gerenciar produtos IA
-- Isso corrige o problema onde apenas admins podiam criar/editar produtos

-- Política para INSERT
CREATE POLICY "Usuarios com permissao ia_configuracao podem criar produtos" 
ON public.tendenci_ia_produtos 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_permissions.user_id = auth.uid()
    AND user_permissions.module = 'ia_configuracao'
    AND user_permissions.can_create = true
  )
);

-- Política para UPDATE
CREATE POLICY "Usuarios com permissao ia_configuracao podem editar produtos" 
ON public.tendenci_ia_produtos 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_permissions.user_id = auth.uid()
    AND user_permissions.module = 'ia_configuracao'
    AND user_permissions.can_edit = true
  )
);

-- Política para DELETE
CREATE POLICY "Usuarios com permissao ia_configuracao podem excluir produtos" 
ON public.tendenci_ia_produtos 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_permissions.user_id = auth.uid()
    AND user_permissions.module = 'ia_configuracao'
    AND user_permissions.can_delete = true
  )
);