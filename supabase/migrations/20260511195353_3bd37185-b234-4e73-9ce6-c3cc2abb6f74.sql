
-- Recreate restrictive policy on profile_types so it does not block SELECT of global rows
DROP POLICY IF EXISTS tenant_isolation_modify_profile_types ON public.profile_types;

CREATE POLICY tenant_isolation_insert_profile_types
  ON public.profile_types AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner() OR public.tenant_rls_check(tenant_id));

CREATE POLICY tenant_isolation_update_profile_types
  ON public.profile_types AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (public.is_owner() OR public.tenant_rls_check(tenant_id))
  WITH CHECK (public.is_owner() OR public.tenant_rls_check(tenant_id));

CREATE POLICY tenant_isolation_delete_profile_types
  ON public.profile_types AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (public.is_owner() OR public.tenant_rls_check(tenant_id));
