
CREATE OR REPLACE FUNCTION public.audit_module_viewers(_modules text[])
RETURNS TABLE(profile_name text, module text, can_view boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pt.name::text, ptp.module::text, ptp.can_view
  FROM public.profile_type_permissions ptp
  JOIN public.profile_types pt ON pt.id = ptp.profile_type_id
  WHERE ptp.module::text = ANY(_modules);
$$;

GRANT EXECUTE ON FUNCTION public.audit_module_viewers(text[]) TO anon, authenticated;
