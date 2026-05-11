-- Whitelist of policies that legitimately don't need tenant_rls_check
-- (e.g. tenants/profiles bootstrap policies, owner-only tables).
CREATE OR REPLACE FUNCTION public._tenant_rls_audit_whitelist(_table text, _policy text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    -- Tables that intentionally bypass tenant_rls_check
    _table IN ('profiles', 'user_tenants', 'tenants')
$$;

-- Lists policies on tenant-scoped tables that DO NOT route through tenant_rls_check.
CREATE OR REPLACE FUNCTION public.audit_tenant_rls_policies()
RETURNS TABLE (
  schemaname text,
  tablename  text,
  policyname text,
  cmd        text,
  reason     text,
  qual       text,
  with_check text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Only platform owners may run the audit.
  IF NOT COALESCE((SELECT is_owner FROM public.profiles WHERE id = auth.uid()), false) THEN
    RAISE EXCEPTION 'Only platform owners can run the RLS audit';
  END IF;

  RETURN QUERY
  WITH tenant_tables AS (
    SELECT c.table_schema, c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'tenant_id'
  )
  SELECT
    p.schemaname::text,
    p.tablename::text,
    p.policyname::text,
    p.cmd::text,
    CASE
      WHEN COALESCE(p.qual, '')       !~* 'tenant_rls_check'
       AND COALESCE(p.with_check, '') !~* 'tenant_rls_check'
        THEN 'policy never calls tenant_rls_check'
      WHEN p.cmd IN ('ALL','SELECT','DELETE')
       AND COALESCE(p.qual, '') !~* 'tenant_rls_check'
        THEN 'USING clause missing tenant_rls_check'
      WHEN p.cmd IN ('ALL','INSERT','UPDATE')
       AND COALESCE(p.with_check, '') !~* 'tenant_rls_check'
        THEN 'WITH CHECK clause missing tenant_rls_check'
    END AS reason,
    p.qual::text,
    p.with_check::text
  FROM pg_policies p
  JOIN tenant_tables t
    ON t.table_schema = p.schemaname
   AND t.table_name   = p.tablename
  WHERE NOT public._tenant_rls_audit_whitelist(p.tablename, p.policyname)
    AND (
         (COALESCE(p.qual, '')       !~* 'tenant_rls_check'
      AND COALESCE(p.with_check, '') !~* 'tenant_rls_check')
      OR (p.cmd IN ('ALL','SELECT','DELETE') AND COALESCE(p.qual, '')       !~* 'tenant_rls_check')
      OR (p.cmd IN ('ALL','INSERT','UPDATE') AND COALESCE(p.with_check, '') !~* 'tenant_rls_check')
    )
  ORDER BY p.tablename, p.policyname;
END;
$$;

-- Lists policies that read profiles.tenant_id / profiles.current_tenant_id directly,
-- bypassing the get_user_tenant_id() / tenant_rls_check() helpers.
CREATE OR REPLACE FUNCTION public.audit_tenant_rls_direct_profile_reads()
RETURNS TABLE (
  schemaname text,
  tablename  text,
  policyname text,
  cmd        text,
  snippet    text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT COALESCE((SELECT is_owner FROM public.profiles WHERE id = auth.uid()), false) THEN
    RAISE EXCEPTION 'Only platform owners can run the RLS audit';
  END IF;

  RETURN QUERY
  SELECT
    p.schemaname::text,
    p.tablename::text,
    p.policyname::text,
    p.cmd::text,
    (COALESCE(p.qual,'') || ' || ' || COALESCE(p.with_check,''))::text AS snippet
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.tablename NOT IN ('profiles','user_tenants','tenants')
    AND (
      COALESCE(p.qual,'')       ~* 'profiles[^a-z_]*\.(tenant_id|current_tenant_id)'
      OR COALESCE(p.with_check,'') ~* 'profiles[^a-z_]*\.(tenant_id|current_tenant_id)'
    )
  ORDER BY p.tablename, p.policyname;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_tenant_rls_policies()           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.audit_tenant_rls_direct_profile_reads() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_tenant_rls_policies()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_tenant_rls_direct_profile_reads() TO authenticated;