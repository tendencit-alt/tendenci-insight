CREATE TABLE IF NOT EXISTS public.profile_type_feature_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  profile_type_id UUID NOT NULL,
  feature_key TEXT NOT NULL,
  can_view BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profile_type_feature_overrides_unique
    UNIQUE (tenant_id, profile_type_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_ptfo_tenant_profile
  ON public.profile_type_feature_overrides(tenant_id, profile_type_id);
CREATE INDEX IF NOT EXISTS idx_ptfo_feature_key
  ON public.profile_type_feature_overrides(feature_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_type_feature_overrides TO authenticated;
GRANT ALL ON public.profile_type_feature_overrides TO service_role;

ALTER TABLE public.profile_type_feature_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ptfo_select ON public.profile_type_feature_overrides;
CREATE POLICY ptfo_select ON public.profile_type_feature_overrides
  FOR SELECT TO authenticated
  USING (
    public.is_owner()
    OR tenant_id = public.get_user_tenant_id()
  );

DROP POLICY IF EXISTS ptfo_insert ON public.profile_type_feature_overrides;
CREATE POLICY ptfo_insert ON public.profile_type_feature_overrides
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_owner()
    OR tenant_id = public.get_user_tenant_id()
  );

DROP POLICY IF EXISTS ptfo_update ON public.profile_type_feature_overrides;
CREATE POLICY ptfo_update ON public.profile_type_feature_overrides
  FOR UPDATE TO authenticated
  USING (
    public.is_owner()
    OR tenant_id = public.get_user_tenant_id()
  );

DROP POLICY IF EXISTS ptfo_delete ON public.profile_type_feature_overrides;
CREATE POLICY ptfo_delete ON public.profile_type_feature_overrides
  FOR DELETE TO authenticated
  USING (
    public.is_owner()
    OR tenant_id = public.get_user_tenant_id()
  );

DROP TRIGGER IF EXISTS trg_ptfo_updated_at ON public.profile_type_feature_overrides;
CREATE TRIGGER trg_ptfo_updated_at
  BEFORE UPDATE ON public.profile_type_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_feature_access(
  _user_id UUID,
  _feature_key TEXT,
  _action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_type UUID;
  v_tenant UUID;
  v_row public.profile_type_feature_overrides%ROWTYPE;
  v_val BOOLEAN;
BEGIN
  IF _user_id IS NULL OR _feature_key IS NULL OR _action IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT profile_type_id, tenant_id
    INTO v_profile_type, v_tenant
    FROM public.profiles
   WHERE id = _user_id
   LIMIT 1;

  IF v_profile_type IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_row
    FROM public.profile_type_feature_overrides
   WHERE profile_type_id = v_profile_type
     AND feature_key = _feature_key
     AND (v_tenant IS NULL OR tenant_id = v_tenant)
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_val := CASE _action
    WHEN 'view'   THEN v_row.can_view
    WHEN 'create' THEN v_row.can_create
    WHEN 'edit'   THEN v_row.can_edit
    WHEN 'delete' THEN v_row.can_delete
    ELSE NULL
  END;

  RETURN v_val;
END;
$$;

REVOKE ALL ON FUNCTION public.has_feature_access(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_feature_access(UUID, TEXT, TEXT) TO authenticated, service_role;
