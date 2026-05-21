-- Add global default % despesas do projeto
ALTER TABLE public.company_settings 
  ADD COLUMN IF NOT EXISTS default_project_budget_percent NUMERIC NOT NULL DEFAULT 60;

-- Update trigger function to use global default instead of hardcoded 50
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
    SELECT COALESCE(SUM(valor_total), 0), MAX(tenant_id) INTO v_total, v_tenant_id
    FROM orders WHERE project_id = OLD.project_id AND status NOT IN ('rascunho', 'cancelado');
    SELECT budget_percent INTO v_percent FROM fin_projects WHERE id = OLD.project_id;
    SELECT default_project_budget_percent INTO v_global_percent FROM company_settings WHERE tenant_id = v_tenant_id LIMIT 1;
    UPDATE fin_projects SET budget = v_total * COALESCE(v_percent, v_global_percent, 60) / 100 WHERE id = OLD.project_id;
  END IF;

  IF v_project_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COALESCE(SUM(valor_total), 0), MAX(tenant_id) INTO v_total, v_tenant_id
  FROM orders WHERE project_id = v_project_id AND status NOT IN ('rascunho', 'cancelado');
  SELECT budget_percent INTO v_percent FROM fin_projects WHERE id = v_project_id;
  SELECT default_project_budget_percent INTO v_global_percent FROM company_settings WHERE tenant_id = v_tenant_id LIMIT 1;

  UPDATE fin_projects SET budget = v_total * COALESCE(v_percent, v_global_percent, 60) / 100 WHERE id = v_project_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Update auto-create to pre-fill budget_percent from global default
CREATE OR REPLACE FUNCTION public.auto_create_fin_project_for_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client_name text;
  v_project_name text;
  v_cost_center_id uuid;
  v_existing_project_id uuid;
  v_global_percent numeric;
BEGIN
  SELECT id INTO v_existing_project_id FROM public.fin_projects WHERE order_id = NEW.id LIMIT 1;
  IF v_existing_project_id IS NOT NULL THEN
    IF NEW.project_id IS NULL THEN NEW.project_id := v_existing_project_id; END IF;
    RETURN NEW;
  END IF;

  SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;
  v_project_name := 'PED-' || COALESCE(NEW.order_number::text, '0') || ' ' || COALESCE(v_client_name, 'Sem Cliente');

  IF NEW.centro_custo IS NOT NULL AND NEW.centro_custo != '' THEN
    SELECT id INTO v_cost_center_id FROM public.fin_cost_centers WHERE name = NEW.centro_custo LIMIT 1;
  END IF;

  SELECT default_project_budget_percent INTO v_global_percent FROM public.company_settings WHERE tenant_id = NEW.tenant_id LIMIT 1;

  INSERT INTO public.fin_projects (
    name, code, status, project_type,
    client_id, owner_id, cost_center_id, chart_account_id, order_id,
    tenant_id, budget_percent
  ) VALUES (
    v_project_name,
    'PED-' || COALESCE(NEW.order_number::text, '0'),
    'ativo', 'pedido',
    NEW.client_id, NEW.vendedor_id, v_cost_center_id, NEW.chart_account_id, NEW.id,
    NEW.tenant_id, COALESCE(v_global_percent, 60)
  ) RETURNING id INTO v_existing_project_id;

  NEW.project_id := v_existing_project_id;
  RETURN NEW;
END;
$function$;