-- Permitir que fin_projects.budget_percent seja NULL e remover default fixo de 50,
-- de modo que projetos sem percentual próprio herdem o % Global (company_settings.default_project_budget_percent).
ALTER TABLE public.fin_projects ALTER COLUMN budget_percent DROP NOT NULL;
ALTER TABLE public.fin_projects ALTER COLUMN budget_percent DROP DEFAULT;

-- Limpar valores legados (50) para que passem a usar o % Global configurado.
UPDATE public.fin_projects SET budget_percent = NULL WHERE budget_percent = 50;

-- Recalcular budgets de todos os projetos com base no % Global (ou local quando existir).
UPDATE public.fin_projects fp
SET budget = COALESCE(t.total, 0)
           * COALESCE(fp.budget_percent,
                      (SELECT default_project_budget_percent FROM public.company_settings cs WHERE cs.tenant_id = fp.tenant_id LIMIT 1),
                      60) / 100
FROM (
  SELECT project_id, SUM(valor_total) AS total
  FROM public.orders
  WHERE status NOT IN ('rascunho','cancelado') AND project_id IS NOT NULL
  GROUP BY project_id
) t
WHERE t.project_id = fp.id;