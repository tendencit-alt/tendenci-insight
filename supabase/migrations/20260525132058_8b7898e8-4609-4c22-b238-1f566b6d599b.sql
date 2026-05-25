
CREATE OR REPLACE FUNCTION public.ensure_user_tenant_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    BEGIN
      v_role := COALESCE(NEW.role, 'vendedor'::user_role);
    EXCEPTION WHEN others THEN
      v_role := 'vendedor'::user_role;
    END;
    INSERT INTO public.user_tenants (user_id, tenant_id, role)
    VALUES (NEW.id, NEW.tenant_id, v_role)
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_user_tenant_membership ON public.profiles;
CREATE TRIGGER trg_ensure_user_tenant_membership
AFTER INSERT OR UPDATE OF tenant_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_user_tenant_membership();

INSERT INTO public.user_tenants (user_id, tenant_id, role)
SELECT p.id, p.tenant_id, COALESCE(p.role, 'vendedor'::user_role)
FROM public.profiles p
WHERE p.tenant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.user_id = p.id AND ut.tenant_id = p.tenant_id
  )
ON CONFLICT (user_id, tenant_id) DO NOTHING;
