
-- 1) Add parent_id for hierarchy
ALTER TABLE public.fin_cost_centers
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.fin_cost_centers(id);

CREATE INDEX IF NOT EXISTS idx_fin_cost_centers_parent_id
  ON public.fin_cost_centers(parent_id);

-- 2) Seeder for default cost centers per tenant
CREATE OR REPLACE FUNCTION public.seed_default_cost_centers(_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  v_parent_id uuid;
  parent_rec record;
  child_rec record;
BEGIN
  IF _tenant_id IS NULL THEN
    RETURN 0;
  END IF;

  FOR parent_rec IN
    SELECT * FROM (VALUES
      ('100', 'Produção'),
      ('200', 'Manutenção'),
      ('300', 'Logística'),
      ('400', 'Comercial'),
      ('900', 'Administrativo')
    ) AS t(code, name)
  LOOP
    SELECT id INTO v_parent_id
    FROM public.fin_cost_centers
    WHERE tenant_id = _tenant_id AND code = parent_rec.code
    LIMIT 1;

    IF v_parent_id IS NULL THEN
      INSERT INTO public.fin_cost_centers (tenant_id, code, name, active, is_system_default, parent_id)
      VALUES (_tenant_id, parent_rec.code, parent_rec.name, true, true, NULL)
      RETURNING id INTO v_parent_id;
      v_count := v_count + 1;
    END IF;

    FOR child_rec IN
      SELECT * FROM (VALUES
        (parent_rec.code, parent_rec.name)
      ) AS p(pcode, pname),
      LATERAL (VALUES
        ((p.pcode::int + 10)::text, p.pname || ' Interna'),
        ((p.pcode::int + 20)::text, p.pname || ' Externa')
      ) AS c(ccode, cname)
    LOOP
      -- Fix gender for non-feminine names (Comercial / Administrativo)
      DECLARE
        v_child_name text := child_rec.cname;
      BEGIN
        IF parent_rec.name IN ('Comercial', 'Administrativo') THEN
          v_child_name := replace(replace(child_rec.cname, ' Interna', ' Interno'), ' Externa', ' Externo');
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM public.fin_cost_centers
          WHERE tenant_id = _tenant_id AND code = child_rec.ccode
        ) THEN
          INSERT INTO public.fin_cost_centers (tenant_id, code, name, active, is_system_default, parent_id)
          VALUES (_tenant_id, child_rec.ccode, v_child_name, true, true, v_parent_id);
          v_count := v_count + 1;
        END IF;
      END;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 3) Trigger to auto-seed on new tenant creation
CREATE OR REPLACE FUNCTION public.trg_seed_tenant_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.seed_default_cost_centers(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_seed_cost_centers ON public.tenants;
CREATE TRIGGER trg_tenant_seed_cost_centers
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_seed_tenant_defaults();

-- 4) Backfill for existing tenants
DO $$
DECLARE
  t_rec record;
BEGIN
  FOR t_rec IN SELECT id FROM public.tenants LOOP
    PERFORM public.seed_default_cost_centers(t_rec.id);
  END LOOP;
END $$;

-- 5) Block delete of parent with children
CREATE OR REPLACE FUNCTION public.fn_block_delete_parent_cost_center()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.fin_cost_centers WHERE parent_id = OLD.id) THEN
    RAISE EXCEPTION 'Não é possível excluir um centro de custo pai que possui filhos vinculados';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_delete_parent_cost_center ON public.fin_cost_centers;
CREATE TRIGGER trg_block_delete_parent_cost_center
  BEFORE DELETE ON public.fin_cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_block_delete_parent_cost_center();

-- 6) Block entries on parent cost centers (parent = has children)
CREATE OR REPLACE FUNCTION public.fn_block_parent_cc_entries()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.cost_center_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.fin_cost_centers WHERE parent_id = NEW.cost_center_id
  ) THEN
    RAISE EXCEPTION 'Centros de custo pai não recebem lançamentos. Selecione um centro de custo filho.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_parent_cc_payables ON public.fin_payables;
CREATE TRIGGER trg_block_parent_cc_payables
  BEFORE INSERT OR UPDATE ON public.fin_payables
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_parent_cc_entries();

DROP TRIGGER IF EXISTS trg_block_parent_cc_receivables ON public.fin_receivables;
CREATE TRIGGER trg_block_parent_cc_receivables
  BEFORE INSERT OR UPDATE ON public.fin_receivables
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_parent_cc_entries();

DROP TRIGGER IF EXISTS trg_block_parent_cc_ledger ON public.fin_ledger_entries;
CREATE TRIGGER trg_block_parent_cc_ledger
  BEFORE INSERT OR UPDATE ON public.fin_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_parent_cc_entries();

DROP TRIGGER IF EXISTS trg_block_parent_cc_splits ON public.fin_ledger_splits;
CREATE TRIGGER trg_block_parent_cc_splits
  BEFORE INSERT OR UPDATE ON public.fin_ledger_splits
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_parent_cc_entries();
