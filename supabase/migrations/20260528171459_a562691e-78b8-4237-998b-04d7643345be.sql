
-- ============================================================
-- Owner Impersonation: enter/exit tenant with audit trail
-- ============================================================

-- 1) clear_active_tenant: Owner returns to Owner mode (current_tenant_id = NULL)
CREATE OR REPLACE FUNCTION public.clear_active_tenant()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  prev_tenant uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT current_tenant_id INTO prev_tenant
  FROM public.profiles WHERE id = uid;

  UPDATE public.profiles
     SET current_tenant_id = NULL,
         updated_at = now()
   WHERE id = uid;

  -- Audit only when an Owner was actually impersonating
  IF prev_tenant IS NOT NULL AND public.is_owner() THEN
    INSERT INTO public.audit_log
      (user_id, tenant_id, table_name, record_id, event_type, event_source, metadata)
    VALUES
      (uid, prev_tenant, 'profiles', uid::text,
       'owner_exit_tenant', 'owner_impersonation',
       jsonb_build_object('left_tenant', prev_tenant));
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_active_tenant() TO authenticated;

-- 2) Re-create set_active_tenant adding audit log on Owner entry
CREATE OR REPLACE FUNCTION public.set_active_tenant(target_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  is_member boolean;
  home_tenant uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF target_tenant_id IS NULL THEN
    RAISE EXCEPTION 'target_tenant_id required';
  END IF;

  SELECT public.is_owner() OR EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_id = uid AND tenant_id = target_tenant_id
  ) INTO is_member;

  IF NOT is_member THEN
    RAISE EXCEPTION 'User is not a member of tenant %', target_tenant_id;
  END IF;

  SELECT tenant_id INTO home_tenant
  FROM public.profiles WHERE id = uid;

  UPDATE public.profiles
     SET current_tenant_id = target_tenant_id,
         updated_at = now()
   WHERE id = uid;

  -- Audit only when Owner enters a tenant that is NOT their home
  IF public.is_owner() AND target_tenant_id IS DISTINCT FROM home_tenant THEN
    INSERT INTO public.audit_log
      (user_id, tenant_id, table_name, record_id, event_type, event_source, metadata)
    VALUES
      (uid, target_tenant_id, 'profiles', uid::text,
       'owner_enter_tenant', 'owner_impersonation',
       jsonb_build_object('entered_tenant', target_tenant_id));
  END IF;

  RETURN target_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_active_tenant(uuid) TO authenticated;
