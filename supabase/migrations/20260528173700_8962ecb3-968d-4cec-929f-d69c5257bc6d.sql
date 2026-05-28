
-- Restrict Owner global bypass to Owner-mode only (current_tenant_id IS NULL).
-- While impersonating, Owner is bound to the impersonated tenant — eliminating
-- cross-tenant leakage in clients / suppliers / order_responsibles (and all
-- other tables sharing tenant_rls_check).

CREATE OR REPLACE FUNCTION public.tenant_rls_check(row_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH p AS (
    SELECT is_owner, current_tenant_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
  SELECT
    -- Owner bypass: only when NOT impersonating any tenant (Owner mode)
    COALESCE((SELECT is_owner AND current_tenant_id IS NULL FROM p), false)
    -- Normal tenant binding (also covers Owner while impersonating, since
    -- get_user_tenant_id() returns current_tenant_id in that case)
    OR row_tenant_id = public.get_user_tenant_id()
$$;

-- Clean duplicate / redundant policies on the 3 target tables so behavior is
-- driven exclusively by the corrected check above.
DROP POLICY IF EXISTS tenant_isolation_select_clients   ON public.clients;
DROP POLICY IF EXISTS tenant_isolation_modify_clients   ON public.clients;
DROP POLICY IF EXISTS tenant_isolation_select_suppliers ON public.suppliers;
DROP POLICY IF EXISTS tenant_isolation_modify_suppliers ON public.suppliers;
