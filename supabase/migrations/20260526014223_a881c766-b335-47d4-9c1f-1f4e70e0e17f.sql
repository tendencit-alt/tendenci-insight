
-- 1. Função para clonar o plano de contas do Owner para um tenant
CREATE OR REPLACE FUNCTION public.seed_chart_of_accounts_from_owner(_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_tenant uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;
  _inserted int := 0;
BEGIN
  IF _tenant_id IS NULL OR _tenant_id = _owner_tenant THEN
    RETURN 0;
  END IF;

  -- Skip if tenant already has any chart account
  IF EXISTS (SELECT 1 FROM fin_chart_accounts WHERE tenant_id = _tenant_id) THEN
    RETURN 0;
  END IF;

  -- Build id mapping (source -> new) and clone in a single CTE
  WITH src AS (
    SELECT
      id AS old_id,
      gen_random_uuid() AS new_id,
      parent_id AS old_parent_id,
      code, name, nature, in_dre, in_cashflow, active,
      dre_order, auto_generate_payable, pai_codigo, grupo_fluxo
    FROM fin_chart_accounts
    WHERE tenant_id = _owner_tenant
  ),
  inserted AS (
    INSERT INTO fin_chart_accounts (
      id, tenant_id, parent_id, code, name, nature,
      in_dre, in_cashflow, active, dre_order,
      auto_generate_payable, is_core, pai_codigo, grupo_fluxo
    )
    SELECT
      s.new_id,
      _tenant_id,
      p.new_id, -- remapped parent
      s.code, s.name, s.nature,
      s.in_dre, s.in_cashflow, s.active, s.dre_order,
      s.auto_generate_payable,
      false, -- tenant copy is editable (not core)
      s.pai_codigo, s.grupo_fluxo
    FROM src s
    LEFT JOIN src p ON p.old_id = s.old_parent_id
    RETURNING 1
  )
  SELECT COUNT(*) INTO _inserted FROM inserted;

  RETURN _inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_chart_of_accounts_from_owner(uuid) TO authenticated, service_role;

-- 2. Atualizar trigger de defaults para incluir o plano de contas
CREATE OR REPLACE FUNCTION public.trg_seed_tenant_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_cost_centers(NEW.id);
  PERFORM public.seed_chart_of_accounts_from_owner(NEW.id);
  RETURN NEW;
END;
$$;

-- 3. Backfill: tenants existentes sem plano de contas
DO $$
DECLARE
  _t record;
  _n int;
BEGIN
  FOR _t IN
    SELECT id FROM tenants
    WHERE id <> 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid
      AND NOT EXISTS (
        SELECT 1 FROM fin_chart_accounts fca WHERE fca.tenant_id = tenants.id
      )
  LOOP
    SELECT public.seed_chart_of_accounts_from_owner(_t.id) INTO _n;
    RAISE NOTICE 'Tenant % seeded with % accounts', _t.id, _n;
  END LOOP;
END $$;
