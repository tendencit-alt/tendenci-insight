-- Remove overly permissive RLS policies on production_phases that allowed any authenticated
-- user to read/write across tenants. The restrictive tenant_isolation_* policies remain
-- and already enforce tenant scoping (with owner bypass via tenant_rls_check).
DROP POLICY IF EXISTS "Autenticados leem fases" ON public.production_phases;
DROP POLICY IF EXISTS "Autenticados atualizam fases" ON public.production_phases;
DROP POLICY IF EXISTS "Autenticados criam fases" ON public.production_phases;

-- Re-create scoped permissive policies (PostgreSQL requires at least one permissive policy
-- per command for it to be accessible). Restrictive policies will still AND on top.
CREATE POLICY "production_phases_select_tenant"
  ON public.production_phases
  FOR SELECT TO authenticated
  USING (public.tenant_rls_check(tenant_id));

CREATE POLICY "production_phases_insert_tenant"
  ON public.production_phases
  FOR INSERT TO authenticated
  WITH CHECK (public.tenant_rls_check(tenant_id));

CREATE POLICY "production_phases_update_tenant"
  ON public.production_phases
  FOR UPDATE TO authenticated
  USING (public.tenant_rls_check(tenant_id))
  WITH CHECK (public.tenant_rls_check(tenant_id));

ALTER TABLE public.production_phases ENABLE ROW LEVEL SECURITY;