
CREATE OR REPLACE FUNCTION public.can_regress_production_phase(_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _policy text;
  _role public.user_role;
  _is_owner boolean;
BEGIN
  BEGIN
    SELECT COALESCE((workflow_config->>'production.regress_policy'), 'supervisor')
      INTO _policy
    FROM public.tenant_customizations
    WHERE tenant_id = _tenant_id
    LIMIT 1;
  EXCEPTION WHEN others THEN
    _policy := 'supervisor';
  END;
  _policy := COALESCE(_policy, 'supervisor');

  IF _policy = 'livre' THEN RETURN true; END IF;

  SELECT role, COALESCE(is_owner,false) INTO _role, _is_owner
  FROM public.profiles WHERE id = auth.uid();

  IF COALESCE(_is_owner,false) THEN RETURN true; END IF;
  IF _role IS NULL THEN RETURN false; END IF;

  -- Allow admins/owners. 'gestor' isn't part of user_role enum, so it's not listed here.
  RETURN _role IN ('admin'::public.user_role, 'owner'::public.user_role, 'tenant_owner'::public.user_role);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.can_regress_production_phase(uuid) FROM anon;
