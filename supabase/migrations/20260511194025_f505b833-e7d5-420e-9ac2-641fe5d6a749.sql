DROP POLICY IF EXISTS tenant_isolation_select_profile_types ON public.profile_types;
CREATE POLICY tenant_isolation_select_profile_types ON public.profile_types
AS RESTRICTIVE FOR SELECT
USING (tenant_id IS NULL OR public.tenant_rls_check(tenant_id));