
-- Add is_system_default flag to fin_cost_centers
ALTER TABLE public.fin_cost_centers
  ADD COLUMN IF NOT EXISTS is_system_default BOOLEAN NOT NULL DEFAULT false;

-- Add is_core flag to fin_chart_accounts
ALTER TABLE public.fin_chart_accounts
  ADD COLUMN IF NOT EXISTS is_core BOOLEAN NOT NULL DEFAULT false;

-- Mark existing root-level chart accounts as core (codes 1-8 are structural roots)
UPDATE public.fin_chart_accounts
SET is_core = true
WHERE parent_id IS NULL AND code IN ('1','2','3','4','5','6','7','8');

-- Mark second-level structural accounts as core too
UPDATE public.fin_chart_accounts
SET is_core = true
WHERE parent_id IN (
  SELECT id FROM public.fin_chart_accounts WHERE parent_id IS NULL AND code IN ('1','2','3','4','5','6','7','8')
);

-- Protection trigger: prevent non-owner from deactivating/deleting system defaults
CREATE OR REPLACE FUNCTION public.protect_system_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For cost centers
  IF TG_TABLE_NAME = 'fin_cost_centers' THEN
    IF OLD.is_system_default = true THEN
      -- Block deactivation
      IF TG_OP = 'UPDATE' AND NEW.active = false AND NOT public.is_owner() THEN
        RAISE EXCEPTION 'Centros de custo padrão do sistema não podem ser desativados';
      END IF;
      -- Block deletion
      IF TG_OP = 'DELETE' AND NOT public.is_owner() THEN
        RAISE EXCEPTION 'Centros de custo padrão do sistema não podem ser excluídos';
      END IF;
      -- Block changing the flag
      IF TG_OP = 'UPDATE' AND NEW.is_system_default != OLD.is_system_default AND NOT public.is_owner() THEN
        RAISE EXCEPTION 'Apenas o OWNER pode alterar a flag de proteção do sistema';
      END IF;
    END IF;
  END IF;

  -- For chart accounts
  IF TG_TABLE_NAME = 'fin_chart_accounts' THEN
    IF OLD.is_core = true THEN
      IF TG_OP = 'UPDATE' AND NEW.active = false AND NOT public.is_owner() THEN
        RAISE EXCEPTION 'Contas estruturais do sistema não podem ser desativadas';
      END IF;
      IF TG_OP = 'DELETE' AND NOT public.is_owner() THEN
        RAISE EXCEPTION 'Contas estruturais do sistema não podem ser excluídas';
      END IF;
      IF TG_OP = 'UPDATE' AND NEW.is_core != OLD.is_core AND NOT public.is_owner() THEN
        RAISE EXCEPTION 'Apenas o OWNER pode alterar a flag de proteção do sistema';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_cost_center_defaults
  BEFORE UPDATE OR DELETE ON public.fin_cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_system_defaults();

CREATE TRIGGER protect_chart_account_core
  BEFORE UPDATE OR DELETE ON public.fin_chart_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_system_defaults();
