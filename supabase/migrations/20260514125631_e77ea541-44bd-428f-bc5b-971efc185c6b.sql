-- 1) Backfill: vincular Maira ao tenant do Pablo
UPDATE public.profiles
SET tenant_id = '11912d24-f3f2-41cb-8b35-d094352d5995'
WHERE id = '80af10e6-2acb-43a6-83cc-f1c8a04da28f'
  AND tenant_id IS NULL;

-- 2) Trigger defensivo: se um profile for inserido/atualizado sem tenant_id,
-- herdar o tenant_id do usuário autenticado (admin que criou).
CREATE OR REPLACE FUNCTION public.ensure_profile_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_tenant uuid;
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO caller_tenant
    FROM public.profiles
    WHERE id = auth.uid();

    IF caller_tenant IS NOT NULL THEN
      NEW.tenant_id := caller_tenant;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_profile_tenant_id ON public.profiles;
CREATE TRIGGER trg_ensure_profile_tenant_id
BEFORE INSERT OR UPDATE OF tenant_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_profile_tenant_id();