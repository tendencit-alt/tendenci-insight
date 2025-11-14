-- Remover trigger e função de criação de permissões padrão
DROP TRIGGER IF EXISTS on_profile_created_permissions ON public.profiles;
DROP FUNCTION IF EXISTS public.create_default_permissions() CASCADE;

-- Corrigir funções que dependem de tendenci_user_permissions
CREATE OR REPLACE FUNCTION public.is_user_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
    AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_module_permission(_user_id uuid, _module text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'admin') THEN true
    ELSE true
  END;
$$;

-- Ajustar políticas RLS para tendenci_seller_goals
DROP POLICY IF EXISTS "Apenas masters podem criar metas individuais" ON public.tendenci_seller_goals;
DROP POLICY IF EXISTS "Apenas masters podem atualizar metas individuais" ON public.tendenci_seller_goals;
DROP POLICY IF EXISTS "Apenas masters podem deletar metas individuais" ON public.tendenci_seller_goals;
DROP POLICY IF EXISTS "Masters podem gerenciar metas individuais" ON public.tendenci_seller_goals;
DROP POLICY IF EXISTS "Todos podem ver metas individuais" ON public.tendenci_seller_goals;
DROP POLICY IF EXISTS "Vendedores podem ver suas metas" ON public.tendenci_seller_goals;

CREATE POLICY "Masters podem criar metas individuais"
ON public.tendenci_seller_goals
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Masters podem atualizar metas individuais"
ON public.tendenci_seller_goals
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Masters podem deletar metas individuais"
ON public.tendenci_seller_goals
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Vendedores podem ver suas próprias metas"
ON public.tendenci_seller_goals
FOR SELECT
TO authenticated
USING (
  vendedor_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Ajustar políticas RLS para tendenci_company_goals
DROP POLICY IF EXISTS "Apenas masters podem atualizar metas da empresa" ON public.tendenci_company_goals;
DROP POLICY IF EXISTS "Apenas masters podem criar metas da empresa" ON public.tendenci_company_goals;
DROP POLICY IF EXISTS "Apenas masters podem deletar metas da empresa" ON public.tendenci_company_goals;
DROP POLICY IF EXISTS "Masters podem gerenciar metas da empresa" ON public.tendenci_company_goals;
DROP POLICY IF EXISTS "Todos podem ver metas da empresa" ON public.tendenci_company_goals;
DROP POLICY IF EXISTS "Vendedores podem ver metas da empresa" ON public.tendenci_company_goals;

CREATE POLICY "Masters criam metas da empresa"
ON public.tendenci_company_goals
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Masters atualizam metas da empresa"
ON public.tendenci_company_goals
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Masters deletam metas da empresa"
ON public.tendenci_company_goals
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Todos podem ver metas da empresa"
ON public.tendenci_company_goals
FOR SELECT
TO authenticated
USING (true);

-- Ajustar políticas RLS para tendenci_goal_progress
DROP POLICY IF EXISTS "Masters podem ver todo o progresso" ON public.tendenci_goal_progress;
DROP POLICY IF EXISTS "Masters podem ver todo progresso de metas" ON public.tendenci_goal_progress;
DROP POLICY IF EXISTS "Vendedores podem ver apenas seu progresso" ON public.tendenci_goal_progress;
DROP POLICY IF EXISTS "Vendedores veem apenas seu progresso" ON public.tendenci_goal_progress;

CREATE POLICY "Masters veem todo progresso"
ON public.tendenci_goal_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Vendedores veem seu progresso"
ON public.tendenci_goal_progress
FOR SELECT
TO authenticated
USING (
  (seller_goal_id IN (
    SELECT id FROM tendenci_seller_goals WHERE vendedor_id = auth.uid()
  )) OR 
  company_goal_id IS NOT NULL
);

-- Trigger para atualizar progresso quando deal é ganho
DROP TRIGGER IF EXISTS trg_update_goal_progress ON public.crm_deals;
CREATE TRIGGER trg_update_goal_progress
AFTER UPDATE ON public.crm_deals
FOR EACH ROW
WHEN (NEW.status = 'won' AND (OLD.status IS NULL OR OLD.status != 'won'))
EXECUTE FUNCTION public.update_goal_progress_on_deal_won();