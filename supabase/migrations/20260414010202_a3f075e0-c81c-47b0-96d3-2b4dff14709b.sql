-- Add missing columns to fin_recurring_contracts
ALTER TABLE public.fin_recurring_contracts
  ADD COLUMN IF NOT EXISTS contract_name text,
  ADD COLUMN IF NOT EXISTS entry_type text NOT NULL DEFAULT 'DESPESA',
  ADD COLUMN IF NOT EXISTS day_due integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS contract_mode text NOT NULL DEFAULT 'continuous',
  ADD COLUMN IF NOT EXISTS total_installments integer,
  ADD COLUMN IF NOT EXISTS generated_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjustment_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS last_adjustment_date date;

-- Backfill contract_name from description
UPDATE public.fin_recurring_contracts SET contract_name = description WHERE contract_name IS NULL;

-- Create timeline table
CREATE TABLE IF NOT EXISTS public.fin_recurring_contract_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.fin_recurring_contracts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text NOT NULL,
  old_value text,
  new_value text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid REFERENCES public.tenants(id)
);

ALTER TABLE public.fin_recurring_contract_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_recurring_timeline" ON public.fin_recurring_contract_timeline
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Auto-set tenant_id on timeline
CREATE OR REPLACE FUNCTION public.set_recurring_timeline_tenant()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_recurring_timeline_tenant ON public.fin_recurring_contract_timeline;
CREATE TRIGGER trg_set_recurring_timeline_tenant
  BEFORE INSERT ON public.fin_recurring_contract_timeline
  FOR EACH ROW EXECUTE FUNCTION public.set_recurring_timeline_tenant();

-- Trigger to auto-log contract status changes to timeline
CREATE OR REPLACE FUNCTION public.log_recurring_contract_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.fin_recurring_contract_timeline (contract_id, event_type, description, old_value, new_value, created_by, tenant_id)
    VALUES (NEW.id,
      CASE NEW.status
        WHEN 'paused' THEN 'paused'
        WHEN 'active' THEN CASE WHEN OLD.status = 'paused' THEN 'reactivated' ELSE 'edited' END
        WHEN 'ended' THEN 'ended'
        ELSE 'edited'
      END,
      'Status alterado de ' || COALESCE(OLD.status, 'N/A') || ' para ' || NEW.status,
      OLD.status, NEW.status, auth.uid(), NEW.tenant_id);
  END IF;

  IF OLD.amount IS DISTINCT FROM NEW.amount THEN
    INSERT INTO public.fin_recurring_contract_timeline (contract_id, event_type, description, old_value, new_value, created_by, tenant_id)
    VALUES (NEW.id, 'adjusted', 'Valor alterado', OLD.amount::text, NEW.amount::text, auth.uid(), NEW.tenant_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_recurring_contract_changes ON public.fin_recurring_contracts;
CREATE TRIGGER trg_log_recurring_contract_changes
  AFTER UPDATE ON public.fin_recurring_contracts
  FOR EACH ROW EXECUTE FUNCTION public.log_recurring_contract_changes();