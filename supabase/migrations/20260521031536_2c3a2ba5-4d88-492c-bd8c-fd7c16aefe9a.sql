-- Fix MAX(uuid) bug in recalculate_project_budget
CREATE OR REPLACE FUNCTION public.recalculate_project_budget()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_project_id UUID;
  v_total NUMERIC;
  v_percent NUMERIC;
  v_global_percent NUMERIC;
  v_tenant_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
  ELSE
    v_project_id := NEW.project_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.project_id IS DISTINCT FROM NEW.project_id AND OLD.project_id IS NOT NULL THEN
    SELECT COALESCE(SUM(valor_total), 0) INTO v_total
    FROM orders WHERE project_id = OLD.project_id AND status NOT IN ('rascunho', 'cancelado');
    SELECT tenant_id, budget_percent INTO v_tenant_id, v_percent FROM fin_projects WHERE id = OLD.project_id;
    SELECT default_project_budget_percent INTO v_global_percent FROM company_settings WHERE tenant_id = v_tenant_id LIMIT 1;
    UPDATE fin_projects SET budget = v_total * COALESCE(v_percent, v_global_percent, 60) / 100 WHERE id = OLD.project_id;
  END IF;

  IF v_project_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(valor_total), 0) INTO v_total
  FROM orders WHERE project_id = v_project_id AND status NOT IN ('rascunho', 'cancelado');
  SELECT tenant_id, budget_percent INTO v_tenant_id, v_percent FROM fin_projects WHERE id = v_project_id;
  SELECT default_project_budget_percent INTO v_global_percent FROM company_settings WHERE tenant_id = v_tenant_id LIMIT 1;

  UPDATE fin_projects SET budget = v_total * COALESCE(v_percent, v_global_percent, 60) / 100 WHERE id = v_project_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Repoint operational_projects from orphan fin_projects to the real one (matched by order)
UPDATE public.operational_projects op
SET project_id = real_fp.id
FROM public.fin_projects orphan
JOIN public.operational_projects op2 ON op2.project_id = orphan.id
JOIN public.fin_projects real_fp
  ON real_fp.order_id = op2.order_id
 AND real_fp.tenant_id IS NOT DISTINCT FROM orphan.tenant_id
 AND real_fp.id <> orphan.id
WHERE op.id = op2.id
  AND orphan.project_type = 'pedido'
  AND orphan.order_id IS NULL;

-- Null out any operational_projects still pointing to orphans we can't remap
UPDATE public.operational_projects op
SET project_id = NULL
FROM public.fin_projects orphan
WHERE op.project_id = orphan.id
  AND orphan.project_type = 'pedido'
  AND orphan.order_id IS NULL;

-- Remove orphan duplicate fin_projects
DELETE FROM public.fin_projects
WHERE project_type = 'pedido' AND order_id IS NULL;

-- Remove residual duplicates per (tenant, order), keeping the oldest
DELETE FROM public.fin_projects fp
USING public.fin_projects fp2
WHERE fp.order_id IS NOT NULL
  AND fp.order_id = fp2.order_id
  AND fp.tenant_id IS NOT DISTINCT FROM fp2.tenant_id
  AND fp.created_at > fp2.created_at;

-- Prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS fin_projects_tenant_order_uidx
  ON public.fin_projects (tenant_id, order_id)
  WHERE order_id IS NOT NULL;