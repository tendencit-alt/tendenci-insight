-- Tighten SELECT policy on public.tenants to prevent tenant enumeration.
-- Regular users only see tenants where they are members (via user_tenants).
-- Master Owner / super-admin (is_owner()) keeps full visibility for tenant switching.
DROP POLICY IF EXISTS "Authenticated can view tenants" ON public.tenants;

CREATE POLICY "Users view own tenants or owner views all"
ON public.tenants
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  public.is_owner()
  OR id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid())
);