-- Canonicaliza o módulo CRM em modules_config e garante CRM em todos os planos.
-- 1) Renomeia o registro 'projetos' para representar oficialmente o CRM unificado.
UPDATE public.modules_config
SET label = 'CRM',
    category = 'comercial',
    sort_order = 10,
    visible_in_menu = true
WHERE module_key = 'projetos';

-- 2) Garante que o registro legado 'crm-comercial' fique oculto do menu (já redireciona para /crm).
UPDATE public.modules_config
SET visible_in_menu = false
WHERE module_key = 'crm-comercial';

-- 3) Garante que todos os planos existentes tenham CRM habilitado (módulo canônico 'projetos').
INSERT INTO public.plan_modules (plan_id, module_key)
SELECT p.plan_id, 'projetos'
FROM (SELECT DISTINCT plan_id FROM public.plan_modules) p
WHERE NOT EXISTS (
  SELECT 1 FROM public.plan_modules pm
  WHERE pm.plan_id = p.plan_id AND pm.module_key = 'projetos'
);