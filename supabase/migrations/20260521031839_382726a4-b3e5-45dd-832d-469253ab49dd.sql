-- Backfill orders.project_id from fin_projects.order_id (orphan cleanup nulled these via FK)
UPDATE public.orders o
SET project_id = fp.id
FROM public.fin_projects fp
WHERE fp.order_id = o.id
  AND o.project_id IS DISTINCT FROM fp.id;

-- Recalculate fin_projects.budget based on current order totals and percent
WITH totals AS (
  SELECT project_id, COALESCE(SUM(valor_total),0) AS total
  FROM public.orders
  WHERE project_id IS NOT NULL AND status NOT IN ('rascunho','cancelado')
  GROUP BY project_id
)
UPDATE public.fin_projects fp
SET budget = t.total * COALESCE(fp.budget_percent, (SELECT default_project_budget_percent FROM public.company_settings WHERE tenant_id = fp.tenant_id LIMIT 1), 60) / 100
FROM totals t
WHERE t.project_id = fp.id;