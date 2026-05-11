
CREATE OR REPLACE FUNCTION public.fn_profile_type_templates_protect_builtin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.is_builtin THEN
    RAISE EXCEPTION 'Templates internos do sistema não podem ser excluídos.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
