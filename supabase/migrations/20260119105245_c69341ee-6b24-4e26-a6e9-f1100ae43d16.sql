-- Fix ia_pending_messages: Remove public access, require authentication
DROP POLICY IF EXISTS "Service role full access pending messages" ON public.ia_pending_messages;

CREATE POLICY "Authenticated users can manage pending messages"
ON public.ia_pending_messages
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Fix production_order_groups: Remove public access, require authentication
DROP POLICY IF EXISTS "Allow all operations on production_order_groups" ON public.production_order_groups;

CREATE POLICY "Authenticated users can manage production order groups"
ON public.production_order_groups
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Fix tendenci_ia_produtos: Change public read policy to authenticated-only
DROP POLICY IF EXISTS "Leitura publica de produtos ativos" ON public.tendenci_ia_produtos;

CREATE POLICY "Authenticated users can view products"
ON public.tendenci_ia_produtos
FOR SELECT
TO authenticated
USING (
  (ativo = true)
  OR (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
  ))
  OR (EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_permissions.user_id = auth.uid()
    AND user_permissions.module = 'ia_configuracao'::app_module
    AND user_permissions.can_view = true
  ))
);