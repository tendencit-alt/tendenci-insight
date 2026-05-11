CREATE OR REPLACE FUNCTION public.fn_profile_type_templates_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_profile_type_templates_protect_builtin()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF OLD.is_builtin THEN
      RAISE EXCEPTION 'Templates internos do sistema não podem ser excluídos.';
    END IF;
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.is_builtin AND NEW.is_builtin THEN
      RAISE EXCEPTION 'Templates internos do sistema não podem ser editados.';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;