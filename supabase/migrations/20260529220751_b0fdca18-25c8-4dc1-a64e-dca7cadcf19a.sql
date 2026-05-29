
-- Prazo (SLA) em dias para cada status de produção
ALTER TABLE public.production_status_columns
  ADD COLUMN IF NOT EXISTS sla_days integer;

-- Rastrear quando o status atual da OP foi definido
ALTER TABLE public.ops_orders
  ADD COLUMN IF NOT EXISTS status_changed_at timestamp with time zone DEFAULT now();

UPDATE public.ops_orders SET status_changed_at = COALESCE(status_changed_at, updated_at, created_at, now())
WHERE status_changed_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_ops_orders_status_changed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status_changed_at := COALESCE(NEW.status_changed_at, now());
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ops_orders_status_changed_at ON public.ops_orders;
CREATE TRIGGER trg_ops_orders_status_changed_at
BEFORE INSERT OR UPDATE OF status ON public.ops_orders
FOR EACH ROW EXECUTE FUNCTION public.set_ops_orders_status_changed_at();
