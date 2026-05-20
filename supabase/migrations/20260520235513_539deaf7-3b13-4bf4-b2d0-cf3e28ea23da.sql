
-- 1) Seed production_types if missing (include slug)
INSERT INTO public.production_types (tenant_id, name, slug, active)
SELECT DISTINCT o.tenant_id, t.name, t.slug, true
FROM public.orders o
CROSS JOIN (VALUES
  ('Planejados','planejados'),
  ('Produção Interna','producao-interna'),
  ('Produção Externa','producao-externa'),
  ('Assistência Técnica','assistencia-tecnica'),
  ('Montagem','montagem')
) AS t(name, slug)
WHERE NOT EXISTS (
  SELECT 1 FROM public.production_types pt
  WHERE pt.tenant_id = o.tenant_id AND pt.name = t.name
);

-- 2) Auto-create operational_project on order insert
CREATE OR REPLACE FUNCTION public.auto_create_operational_project_for_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_client text; v_cc uuid; v_pid uuid;
BEGIN
  IF NEW.operational_project_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT name INTO v_client FROM public.clients WHERE id = NEW.client_id;
  IF NEW.centro_custo IS NOT NULL AND NEW.centro_custo <> '' THEN
    SELECT id INTO v_cc FROM public.fin_cost_centers
    WHERE tenant_id = NEW.tenant_id AND name = NEW.centro_custo LIMIT 1;
  END IF;
  INSERT INTO public.operational_projects (
    tenant_id, name, client_id, order_id, cost_center_id, project_id, responsible_id, status, created_by
  ) VALUES (
    NEW.tenant_id,
    COALESCE(NEW.centro_custo,'Pedido')||' - '||COALESCE(v_client,'Cliente')||' #'||COALESCE(NEW.order_number::text,'0'),
    NEW.client_id, NEW.id, v_cc, NEW.project_id, NEW.vendedor_id, 'em_andamento', NEW.created_by
  ) RETURNING id INTO v_pid;
  NEW.operational_project_id := v_pid;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_auto_create_operational_project ON public.orders;
CREATE TRIGGER trg_auto_create_operational_project
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.auto_create_operational_project_for_order();

-- 3) Create production_order per item after item insert
CREATE OR REPLACE FUNCTION public.create_production_from_order_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_order RECORD; v_type uuid; v_client text; v_new uuid; v_phase uuid; v_slug text;
BEGIN
  IF NEW.centro_custo IS NULL OR NEW.centro_custo = '' THEN RETURN NEW; END IF;
  IF NEW.production_order_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT id, status, order_number, client_id, tenant_id INTO v_order
  FROM public.orders WHERE id = NEW.order_id;
  IF v_order.id IS NULL THEN RETURN NEW; END IF;
  IF v_order.status NOT IN ('ativo','em_producao','aprovado','approved') THEN RETURN NEW; END IF;

  SELECT id INTO v_type FROM public.production_types
  WHERE tenant_id = v_order.tenant_id AND active = true AND (
    name = NEW.centro_custo OR name ILIKE '%'||NEW.centro_custo||'%' OR NEW.centro_custo ILIKE '%'||name||'%'
  ) LIMIT 1;

  IF v_type IS NULL THEN
    v_slug := lower(regexp_replace(NEW.centro_custo, '[^a-zA-Z0-9]+', '-', 'g'));
    INSERT INTO public.production_types (tenant_id, name, slug, active)
    VALUES (v_order.tenant_id, NEW.centro_custo, v_slug, true)
    RETURNING id INTO v_type;
  END IF;

  SELECT name INTO v_client FROM public.clients WHERE id = v_order.client_id;
  INSERT INTO public.production_orders (
    order_id, order_item_id, production_type_id, client_id, title, status, priority, tenant_id
  ) VALUES (
    v_order.id, NEW.id, v_type, v_order.client_id,
    'Pedido #'||v_order.order_number||' - '||COALESCE(NEW.descricao,COALESCE(v_client,'Cliente')),
    'aguardando','normal', v_order.tenant_id
  ) RETURNING id INTO v_new;

  SELECT id INTO v_phase FROM public.production_phases
  WHERE production_order_id = v_new ORDER BY position ASC LIMIT 1;
  IF v_phase IS NOT NULL THEN
    UPDATE public.production_orders SET current_phase_id = v_phase WHERE id = v_new;
    UPDATE public.production_phases SET status='em_andamento', started_at=now() WHERE id = v_phase;
  END IF;

  NEW.production_order_id := v_new;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_create_production_from_order_item ON public.order_items;
CREATE TRIGGER trg_create_production_from_order_item
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.create_production_from_order_item();

-- 4) Backfill operational projects
DO $$
DECLARE r RECORD; v_cc uuid; v_pid uuid; v_client text;
BEGIN
  FOR r IN SELECT * FROM public.orders
    WHERE operational_project_id IS NULL AND status IN ('ativo','em_producao')
      AND created_at > now() - interval '60 days'
  LOOP
    SELECT name INTO v_client FROM public.clients WHERE id = r.client_id;
    v_cc := NULL;
    IF r.centro_custo IS NOT NULL AND r.centro_custo <> '' THEN
      SELECT id INTO v_cc FROM public.fin_cost_centers
      WHERE tenant_id = r.tenant_id AND name = r.centro_custo LIMIT 1;
    END IF;
    INSERT INTO public.operational_projects (
      tenant_id, name, client_id, order_id, cost_center_id, project_id, responsible_id, status, created_by
    ) VALUES (
      r.tenant_id,
      COALESCE(r.centro_custo,'Pedido')||' - '||COALESCE(v_client,'Cliente')||' #'||COALESCE(r.order_number::text,'0'),
      r.client_id, r.id, v_cc, r.project_id, r.vendedor_id, 'em_andamento', r.created_by
    ) RETURNING id INTO v_pid;
    UPDATE public.orders SET operational_project_id = v_pid WHERE id = r.id;
  END LOOP;
END$$;

-- 5) Backfill production_orders
DO $$
DECLARE it RECORD; v_type uuid; v_client text; v_new uuid; v_phase uuid; v_slug text;
BEGIN
  FOR it IN
    SELECT oi.*, o.tenant_id AS o_tenant, o.status AS o_status, o.client_id AS o_client, o.order_number AS o_num
    FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.production_order_id IS NULL
      AND oi.centro_custo IS NOT NULL AND oi.centro_custo <> ''
      AND o.status IN ('ativo','em_producao')
      AND o.created_at > now() - interval '60 days'
  LOOP
    SELECT id INTO v_type FROM public.production_types
    WHERE tenant_id = it.o_tenant AND active = true AND (
      name = it.centro_custo OR name ILIKE '%'||it.centro_custo||'%' OR it.centro_custo ILIKE '%'||name||'%'
    ) LIMIT 1;
    IF v_type IS NULL THEN
      v_slug := lower(regexp_replace(it.centro_custo, '[^a-zA-Z0-9]+', '-', 'g'));
      INSERT INTO public.production_types (tenant_id, name, slug, active)
      VALUES (it.o_tenant, it.centro_custo, v_slug, true) RETURNING id INTO v_type;
    END IF;
    SELECT name INTO v_client FROM public.clients WHERE id = it.o_client;
    INSERT INTO public.production_orders (
      order_id, order_item_id, production_type_id, client_id, title, status, priority, tenant_id
    ) VALUES (
      it.order_id, it.id, v_type, it.o_client,
      'Pedido #'||it.o_num||' - '||COALESCE(it.descricao,COALESCE(v_client,'Cliente')),
      'aguardando','normal', it.o_tenant
    ) RETURNING id INTO v_new;
    SELECT id INTO v_phase FROM public.production_phases WHERE production_order_id = v_new ORDER BY position ASC LIMIT 1;
    IF v_phase IS NOT NULL THEN
      UPDATE public.production_orders SET current_phase_id = v_phase WHERE id = v_new;
      UPDATE public.production_phases SET status='em_andamento', started_at=now() WHERE id = v_phase;
    END IF;
    UPDATE public.order_items SET production_order_id = v_new WHERE id = it.id;
  END LOOP;
END$$;
