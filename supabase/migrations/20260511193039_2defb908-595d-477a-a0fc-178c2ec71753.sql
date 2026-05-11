
-- 1) Remove proteção: cada empresa gerencia seus templates livremente
DROP TRIGGER IF EXISTS trg_profile_type_templates_protect ON public.profile_type_templates;
DROP FUNCTION IF EXISTS public.fn_profile_type_templates_protect_builtin();

-- 2) Garantir unicidade por (tenant_id, name) caso ainda não exista
CREATE UNIQUE INDEX IF NOT EXISTS profile_type_templates_tenant_name_uniq
  ON public.profile_type_templates (COALESCE(tenant_id::text, 'GLOBAL'), name);

-- 3) Função: copia para o tenant do chamador todos os templates padrão (globais)
--    que ainda não existirem como cópia local; cópias são is_builtin=false
CREATE OR REPLACE FUNCTION public.seed_tenant_profile_templates()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_count  integer := 0;
BEGIN
  v_tenant := public.get_user_tenant_id();
  IF v_tenant IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.profile_type_templates
    (tenant_id, name, description, color, icon, permissions, is_builtin, created_by)
  SELECT v_tenant, t.name, t.description, t.color, t.icon, t.permissions, false, auth.uid()
  FROM public.profile_type_templates t
  WHERE t.tenant_id IS NULL
    AND t.is_builtin = true
    AND NOT EXISTS (
      SELECT 1 FROM public.profile_type_templates x
      WHERE x.tenant_id = v_tenant AND x.name = t.name
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_tenant_profile_templates() TO authenticated;
