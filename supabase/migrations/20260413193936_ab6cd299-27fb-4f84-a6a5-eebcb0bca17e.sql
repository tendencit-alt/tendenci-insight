
-- =============================================
-- 1. NOVOS CENTROS DE CUSTO
-- =============================================

INSERT INTO public.fin_cost_centers (name, code, active)
SELECT v.name, v.code, true
FROM (VALUES
  ('Produção Interna', 'CC011'),
  ('Produção Externa', 'CC012'),
  ('Montagem', 'CC013'),
  ('Assistência Técnica', 'CC014')
) AS v(name, code)
WHERE NOT EXISTS (
  SELECT 1 FROM public.fin_cost_centers WHERE fin_cost_centers.name = v.name
);

-- =============================================
-- 2. EXPANDIR FIN_PROJECTS
-- =============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_projects' AND column_name = 'project_type') THEN
    ALTER TABLE public.fin_projects ADD COLUMN project_type text DEFAULT 'pedido';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_projects' AND column_name = 'client_id') THEN
    ALTER TABLE public.fin_projects ADD COLUMN client_id uuid REFERENCES public.clients(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_projects' AND column_name = 'vendedor_id') THEN
    ALTER TABLE public.fin_projects ADD COLUMN vendedor_id uuid REFERENCES public.profiles(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_projects' AND column_name = 'cost_center_id') THEN
    ALTER TABLE public.fin_projects ADD COLUMN cost_center_id uuid REFERENCES public.fin_cost_centers(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_projects' AND column_name = 'chart_account_id') THEN
    ALTER TABLE public.fin_projects ADD COLUMN chart_account_id uuid REFERENCES public.fin_chart_accounts(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_projects' AND column_name = 'order_id') THEN
    ALTER TABLE public.fin_projects ADD COLUMN order_id uuid REFERENCES public.orders(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_projects' AND column_name = 'description') THEN
    ALTER TABLE public.fin_projects ADD COLUMN description text;
  END IF;
END $$;

-- Index for order lookup
CREATE INDEX IF NOT EXISTS idx_fin_projects_order_id ON public.fin_projects(order_id);
CREATE INDEX IF NOT EXISTS idx_fin_projects_client_id ON public.fin_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_fin_projects_project_type ON public.fin_projects(project_type);

-- =============================================
-- 3. AUTO-GENERATE FIN_PROJECT ON ORDER INSERT
-- =============================================

CREATE OR REPLACE FUNCTION public.auto_create_fin_project_for_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name text;
  v_project_name text;
  v_cost_center_id uuid;
  v_existing_project_id uuid;
BEGIN
  -- Skip if project already exists for this order
  SELECT id INTO v_existing_project_id
  FROM public.fin_projects
  WHERE order_id = NEW.id
  LIMIT 1;

  IF v_existing_project_id IS NOT NULL THEN
    -- Update order's project_id if not set
    IF NEW.project_id IS NULL THEN
      NEW.project_id := v_existing_project_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Get client name
  SELECT name INTO v_client_name
  FROM public.clients
  WHERE id = NEW.client_id;

  -- Build project name: PED-{order_number} {client}
  v_project_name := 'PED-' || COALESCE(NEW.order_number::text, '0') || ' ' || COALESCE(v_client_name, 'Sem Cliente');

  -- Resolve cost_center_id from centro_custo name
  IF NEW.centro_custo IS NOT NULL AND NEW.centro_custo != '' THEN
    SELECT id INTO v_cost_center_id
    FROM public.fin_cost_centers
    WHERE name = NEW.centro_custo
    LIMIT 1;
  END IF;

  -- Create the financial project with inheritance
  INSERT INTO public.fin_projects (
    name, code, status, project_type,
    client_id, owner_id, cost_center_id, chart_account_id, order_id,
    tenant_id
  ) VALUES (
    v_project_name,
    'PED-' || COALESCE(NEW.order_number::text, '0'),
    'ativo',
    'pedido',
    NEW.client_id,
    NEW.vendedor_id,
    v_cost_center_id,
    NEW.chart_account_id,
    NEW.id,
    NEW.tenant_id
  )
  RETURNING id INTO v_existing_project_id;

  -- Link back to order
  NEW.project_id := v_existing_project_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_fin_project ON public.orders;
CREATE TRIGGER trg_auto_create_fin_project
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_fin_project_for_order();

-- =============================================
-- 4. SYNC PROJECT ON ORDER UPDATE
-- =============================================

CREATE OR REPLACE FUNCTION public.sync_fin_project_on_order_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name text;
  v_cost_center_id uuid;
  v_project_name text;
BEGIN
  -- Only sync if relevant fields changed
  IF OLD.client_id IS DISTINCT FROM NEW.client_id
     OR OLD.vendedor_id IS DISTINCT FROM NEW.vendedor_id
     OR OLD.centro_custo IS DISTINCT FROM NEW.centro_custo
     OR OLD.chart_account_id IS DISTINCT FROM NEW.chart_account_id
  THEN
    -- Resolve client name
    SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;

    -- Resolve cost_center_id
    IF NEW.centro_custo IS NOT NULL AND NEW.centro_custo != '' THEN
      SELECT id INTO v_cost_center_id FROM public.fin_cost_centers WHERE name = NEW.centro_custo LIMIT 1;
    END IF;

    v_project_name := 'PED-' || COALESCE(NEW.order_number::text, '0') || ' ' || COALESCE(v_client_name, 'Sem Cliente');

    UPDATE public.fin_projects
    SET
      name = v_project_name,
      client_id = NEW.client_id,
      owner_id = NEW.vendedor_id,
      cost_center_id = v_cost_center_id,
      chart_account_id = NEW.chart_account_id
    WHERE order_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_fin_project_on_order_update ON public.orders;
CREATE TRIGGER trg_sync_fin_project_on_order_update
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_fin_project_on_order_update();
