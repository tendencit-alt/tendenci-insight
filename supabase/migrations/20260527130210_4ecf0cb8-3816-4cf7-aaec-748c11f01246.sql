
-- Tenant-scope user reads: admins see only users in their tenant; Owner sees all; self always visible.
DROP POLICY IF EXISTS "Owners/admins view users" ON public.users;

CREATE POLICY "Users readable scoped by tenant"
ON public.users
FOR SELECT
TO authenticated
USING (
  is_owner()
  OR id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = public.users.id
      AND p.tenant_id IS NOT NULL
      AND public.is_tenant_admin(p.tenant_id)
  )
);
