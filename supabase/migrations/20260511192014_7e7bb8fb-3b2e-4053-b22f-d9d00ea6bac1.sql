
-- 1) Permitir nomes iguais em tenants diferentes
ALTER TABLE public.profile_types DROP CONSTRAINT IF EXISTS profile_types_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS profile_types_tenant_name_uniq
  ON public.profile_types (COALESCE(tenant_id::text, 'GLOBAL'), name);

-- 2) Função: clona os profile_types de sistema (tenant_id IS NULL) para o tenant do chamador
CREATE OR REPLACE FUNCTION public.seed_tenant_profile_types()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_count integer := 0;
  v_src record;
  v_new_id uuid;
BEGIN
  v_tenant := public.get_user_tenant_id();
  IF v_tenant IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_src IN
    SELECT pt.*
    FROM public.profile_types pt
    WHERE pt.tenant_id IS NULL
      AND COALESCE(pt.is_active, true) = true
      AND NOT EXISTS (
        SELECT 1 FROM public.profile_types t
        WHERE t.tenant_id = v_tenant AND t.name = pt.name
      )
  LOOP
    INSERT INTO public.profile_types
      (name, display_name, description, color, icon, is_system, is_active, tenant_id)
    VALUES
      (v_src.name, v_src.display_name, v_src.description, v_src.color, v_src.icon, false, true, v_tenant)
    RETURNING id INTO v_new_id;

    -- Copia permissões críticas, se existirem
    INSERT INTO public.rbac_critical_permissions (profile_type_id, permission_key, allowed)
    SELECT v_new_id, rcp.permission_key, rcp.allowed
    FROM public.rbac_critical_permissions rcp
    WHERE rcp.profile_type_id = v_src.id
    ON CONFLICT DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_tenant_profile_types() TO authenticated;
