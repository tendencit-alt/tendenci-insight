
-- 1) plan_modules table
CREATE TABLE IF NOT EXISTS public.plan_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.tenant_plans(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_plan_modules_plan ON public.plan_modules(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_modules_module ON public.plan_modules(module_key);

ALTER TABLE public.plan_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view plan modules"
  ON public.plan_modules FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Owner manages plan modules"
  ON public.plan_modules FOR ALL
  TO authenticated
  USING (is_owner())
  WITH CHECK (is_owner());

-- 2) Seed Enterprise = ALL modules from catalog
INSERT INTO public.plan_modules (plan_id, module_key)
SELECT 'a1000000-0000-0000-0000-000000000003'::uuid, mc.module_key
FROM public.modules_config mc
ON CONFLICT (plan_id, module_key) DO NOTHING;

-- 3) Seed Básico (enxuto)
INSERT INTO public.plan_modules (plan_id, module_key)
SELECT 'a1000000-0000-0000-0000-000000000001'::uuid, m
FROM unnest(ARRAY[
  'crm','clientes','catalogo-produtos','pedidos','financeiro',
  'dashboard','bi-dashboard','relatorios',
  'configuracoes-usuarios','configuracoes-marca','configuracoes-financeiro'
]) AS m
WHERE EXISTS (SELECT 1 FROM public.modules_config WHERE module_key = m)
ON CONFLICT (plan_id, module_key) DO NOTHING;

-- 4) Seed Pro (amplo)
INSERT INTO public.plan_modules (plan_id, module_key)
SELECT 'a1000000-0000-0000-0000-000000000002'::uuid, m
FROM unnest(ARRAY[
  'crm','crm-comercial','clientes','catalogo-produtos','pedidos','financeiro',
  'dashboard','bi-dashboard','relatorios','paineis',
  'estoque','fornecedores','suprimentos','comissoes','leads','prospeccao',
  'contratos','orcamentos','metas','planning','cadastros-financeiros',
  'producao','producao-operacoes','projetos','tarefas','atividades',
  'billing','cobranca','rh','documentos','aprovacoes',
  'configuracoes-usuarios','configuracoes-marca','configuracoes-financeiro'
]) AS m
WHERE EXISTS (SELECT 1 FROM public.modules_config WHERE module_key = m)
ON CONFLICT (plan_id, module_key) DO NOTHING;
