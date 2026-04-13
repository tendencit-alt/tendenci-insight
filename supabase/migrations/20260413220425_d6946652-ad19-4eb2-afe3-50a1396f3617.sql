
-- Fix functions to use text cast (avoids "unsafe use of new enum value" error)
CREATE OR REPLACE FUNCTION public.is_tenant_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = 'tenant_owner'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin_or_above()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (role::text IN ('tenant_owner', 'tenant_admin', 'admin') OR is_owner = true)
  )
$$;
