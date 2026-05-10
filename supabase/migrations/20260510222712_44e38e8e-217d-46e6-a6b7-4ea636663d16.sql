-- 1. Add current_tenant_id to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

-- 2. user_tenants (N:N membership)
CREATE TABLE IF NOT EXISTS public.user_tenants (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tenants_user   ON public.user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant ON public.user_tenants(tenant_id);

ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_tenants_select_self_or_owner" ON public.user_tenants;
CREATE POLICY "user_tenants_select_self_or_owner"
  ON public.user_tenants FOR SELECT
  USING (user_id = auth.uid() OR public.is_owner());

DROP POLICY IF EXISTS "user_tenants_owner_write" ON public.user_tenants;
CREATE POLICY "user_tenants_owner_write"
  ON public.user_tenants FOR ALL
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

-- 3. Backfill memberships from existing profiles
INSERT INTO public.user_tenants (user_id, tenant_id, role)
SELECT p.id, p.tenant_id, COALESCE(p.role::text, 'member')
FROM public.profiles p
WHERE p.tenant_id IS NOT NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 4. Resolve active tenant: prefer profiles.current_tenant_id when user is a member;
--    else fallback to home tenant_id. Owner can use any tenant.
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH p AS (
    SELECT tenant_id, current_tenant_id, is_owner
    FROM public.profiles
    WHERE id = auth.uid()
  )
  SELECT COALESCE(
    (SELECT current_tenant_id
       FROM p
       WHERE current_tenant_id IS NOT NULL
         AND (
           is_owner = true
           OR EXISTS (
             SELECT 1 FROM public.user_tenants ut
             WHERE ut.user_id = auth.uid()
               AND ut.tenant_id = (SELECT current_tenant_id FROM p)
           )
         )
    ),
    (SELECT tenant_id FROM p)
  )
$function$;

-- 5. Switch helper: validates membership before activating
CREATE OR REPLACE FUNCTION public.set_active_tenant(target_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  is_member boolean;
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

  UPDATE public.profiles
     SET current_tenant_id = target_tenant_id,
         updated_at = now()
   WHERE id = uid;

  RETURN target_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_active_tenant(uuid) TO authenticated;
