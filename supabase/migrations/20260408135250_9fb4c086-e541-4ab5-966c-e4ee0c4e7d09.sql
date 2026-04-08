
-- Step 1: Drop dependent policies
DROP POLICY IF EXISTS "Super admins manage plans" ON public.tenant_plans;
DROP POLICY IF EXISTS "Super admins manage tenants" ON public.tenants;
DROP POLICY IF EXISTS "tenant_isolation_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "tenant_isolation_modify_profiles" ON public.profiles;

-- Step 2: Rename column
ALTER TABLE public.profiles RENAME COLUMN is_super_admin TO is_owner;

-- Step 3: Drop old function and create new one
DROP FUNCTION IF EXISTS public.is_super_admin();

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_owner FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;

-- Step 4: Update tenant_rls_check
CREATE OR REPLACE FUNCTION public.tenant_rls_check(row_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_owner() OR row_tenant_id = public.get_user_tenant_id()
$$;

-- Step 5: Recreate policies using is_owner()
CREATE POLICY "Owner manages plans" ON public.tenant_plans
  FOR ALL TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

CREATE POLICY "Owner manages tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

CREATE POLICY "tenant_isolation_select_profiles" ON public.profiles
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.is_owner() OR tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_isolation_modify_profiles" ON public.profiles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR tenant_id = public.get_user_tenant_id())
  WITH CHECK (public.is_owner() OR tenant_id = public.get_user_tenant_id());
