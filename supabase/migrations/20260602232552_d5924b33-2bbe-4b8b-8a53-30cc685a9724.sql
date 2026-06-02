-- Function to sync project end_date to MAX of its orders' data_entrega_prevista
CREATE OR REPLACE FUNCTION public.sync_project_deadline_from_orders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_max_deadline date;
BEGIN
  -- Determine which project(s) to recompute
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
  ELSE
    v_project_id := NEW.project_id;
  END IF;

  IF v_project_id IS NOT NULL THEN
    SELECT MAX(data_entrega_prevista)
      INTO v_max_deadline
      FROM public.orders
     WHERE project_id = v_project_id
       AND data_entrega_prevista IS NOT NULL;

    UPDATE public.fin_projects
       SET end_date = v_max_deadline
     WHERE id = v_project_id;
  END IF;

  -- Also handle old project if project_id changed on UPDATE
  IF TG_OP = 'UPDATE' AND OLD.project_id IS DISTINCT FROM NEW.project_id AND OLD.project_id IS NOT NULL THEN
    SELECT MAX(data_entrega_prevista)
      INTO v_max_deadline
      FROM public.orders
     WHERE project_id = OLD.project_id
       AND data_entrega_prevista IS NOT NULL;

    UPDATE public.fin_projects
       SET end_date = v_max_deadline
     WHERE id = OLD.project_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_project_deadline ON public.orders;
CREATE TRIGGER trg_sync_project_deadline
AFTER INSERT OR UPDATE OF data_entrega_prevista, project_id OR DELETE
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_project_deadline_from_orders();

-- Function to propagate order deadline change to production_orders
CREATE OR REPLACE FUNCTION public.sync_production_orders_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.data_entrega_prevista IS DISTINCT FROM OLD.data_entrega_prevista THEN
    UPDATE public.production_orders
       SET planned_end_date = NEW.data_entrega_prevista
     WHERE order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_production_orders_deadline ON public.orders;
CREATE TRIGGER trg_sync_production_orders_deadline
AFTER UPDATE OF data_entrega_prevista ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_production_orders_deadline();

-- Backfill existing projects so they immediately reflect the rule
UPDATE public.fin_projects p
   SET end_date = sub.max_deadline
  FROM (
    SELECT project_id, MAX(data_entrega_prevista) AS max_deadline
      FROM public.orders
     WHERE project_id IS NOT NULL
       AND data_entrega_prevista IS NOT NULL
     GROUP BY project_id
  ) sub
 WHERE p.id = sub.project_id
   AND (p.end_date IS DISTINCT FROM sub.max_deadline);
