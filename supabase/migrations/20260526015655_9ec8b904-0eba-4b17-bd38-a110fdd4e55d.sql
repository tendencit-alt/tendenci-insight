CREATE OR REPLACE FUNCTION public.purge_order_generated_records(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _project_ids uuid[] := '{}'::uuid[];
BEGIN
  SELECT COALESCE(array_agg(id), '{}'::uuid[])
    INTO _project_ids
  FROM public.fin_projects
  WHERE order_id = _order_id;

  DELETE FROM public.fin_assets
  WHERE project_id = ANY(_project_ids);

  DELETE FROM public.fin_classification_history
  WHERE project_id = ANY(_project_ids);

  DELETE FROM public.fin_classification_rules
  WHERE project_id = ANY(_project_ids);

  DELETE FROM public.fin_event_automation_rules
  WHERE project_id = ANY(_project_ids);

  DELETE FROM public.fin_forecast_entries
  WHERE project_id = ANY(_project_ids);

  DELETE FROM public.fin_recurring_contracts
  WHERE project_id = ANY(_project_ids);

  DELETE FROM public.fin_ledger_entries
  WHERE order_id = _order_id
     OR project_id = ANY(_project_ids);

  DELETE FROM public.fin_receivables
  WHERE order_id = _order_id
     OR project_id = ANY(_project_ids);

  DELETE FROM public.fin_payables
  WHERE order_id = _order_id
     OR project_id = ANY(_project_ids);

  DELETE FROM public.fin_financial_goals
  WHERE order_id = _order_id
     OR project_id = ANY(_project_ids);

  DELETE FROM public.fin_budgets
  WHERE order_id = _order_id
     OR project_id = ANY(_project_ids);

  DELETE FROM public.fin_forecasts
  WHERE order_id = _order_id
     OR project_id = ANY(_project_ids);

  DELETE FROM public.ops_orders
  WHERE source_order_id = _order_id;

  DELETE FROM public.production_orders
  WHERE order_id = _order_id
     OR order_item_id IN (
       SELECT id
       FROM public.order_items
       WHERE order_id = _order_id
     );

  DELETE FROM public.production_order_groups
  WHERE order_id = _order_id;

  DELETE FROM public.quotes
  WHERE order_id = _order_id;

  DELETE FROM public.contracts
  WHERE order_id = _order_id;

  DELETE FROM public.order_history
  WHERE order_id = _order_id;

  DELETE FROM public.order_items
  WHERE order_id = _order_id;

  DELETE FROM public.operational_projects
  WHERE order_id = _order_id
     OR project_id = ANY(_project_ids);

  DELETE FROM public.fin_projects
  WHERE order_id = _order_id;
END;
$$;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_operational_project_id_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_operational_project_id_fkey
  FOREIGN KEY (operational_project_id)
  REFERENCES public.operational_projects(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

CREATE OR REPLACE FUNCTION public.cascade_delete_order_dependencies()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.purge_order_generated_records(OLD.id);
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_order_cascade(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid;
BEGIN
  SELECT tenant_id INTO _tenant
  FROM public.orders
  WHERE id = _order_id;

  IF _tenant IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF NOT (
    public.is_owner()
    OR EXISTS (
      SELECT 1
      FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = _tenant
    )
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  DELETE FROM public.orders
  WHERE id = _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;
END;
$$;

DO $$
DECLARE
  _orphan_order_id uuid;
BEGIN
  FOR _orphan_order_id IN
    SELECT DISTINCT order_id
    FROM (
      SELECT order_id
      FROM public.fin_projects fp
      WHERE order_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.orders o WHERE o.id = fp.order_id
        )

      UNION

      SELECT order_id
      FROM public.operational_projects op
      WHERE order_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.orders o WHERE o.id = op.order_id
        )

      UNION

      SELECT order_id
      FROM public.fin_ledger_entries le
      WHERE order_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.orders o WHERE o.id = le.order_id
        )

      UNION

      SELECT order_id
      FROM public.fin_receivables fr
      WHERE order_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.orders o WHERE o.id = fr.order_id
        )

      UNION

      SELECT order_id
      FROM public.fin_payables fp
      WHERE order_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.orders o WHERE o.id = fp.order_id
        )

      UNION

      SELECT order_id
      FROM public.fin_financial_goals fg
      WHERE order_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.orders o WHERE o.id = fg.order_id
        )

      UNION

      SELECT order_id
      FROM public.fin_budgets fb
      WHERE order_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.orders o WHERE o.id = fb.order_id
        )

      UNION

      SELECT order_id
      FROM public.fin_forecasts ff
      WHERE order_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.orders o WHERE o.id = ff.order_id
        )

      UNION

      SELECT order_id
      FROM public.production_order_groups pog
      WHERE order_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.orders o WHERE o.id = pog.order_id
        )

      UNION

      SELECT order_id
      FROM public.production_orders po
      WHERE order_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.orders o WHERE o.id = po.order_id
        )

      UNION

      SELECT order_id
      FROM public.quotes q
      WHERE order_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.orders o WHERE o.id = q.order_id
        )

      UNION

      SELECT order_id
      FROM public.contracts c
      WHERE order_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.orders o WHERE o.id = c.order_id
        )

      UNION

      SELECT source_order_id AS order_id
      FROM public.ops_orders oo
      WHERE source_order_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.orders o WHERE o.id = oo.source_order_id
        )
    ) orphan_orders
  LOOP
    PERFORM public.purge_order_generated_records(_orphan_order_id);
  END LOOP;
END;
$$;

grant execute on function public.purge_order_generated_records(uuid) to authenticated;
grant execute on function public.delete_order_cascade(uuid) to authenticated;