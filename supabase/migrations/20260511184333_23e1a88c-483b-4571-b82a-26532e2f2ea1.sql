
CREATE OR REPLACE FUNCTION public.validate_profile_template_completeness(perms jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  required_modules text[] := ARRAY[
    'dashboard_executivo','comercial','operacional','financeiro',
    'controladoria','planejamento','cadastros','relatorios_bi','configuracoes'
  ];
  missing_modules text[] := ARRAY[]::text[];
  no_view_modules text[] := ARRAY[]::text[];
  empty_modules  text[] := ARRAY[]::text[];
  m text;
  mod jsonb;
  flag_keys text[] := ARRAY['can_view','can_create','can_edit','can_delete','can_approve','can_conciliate','can_export','can_admin'];
  any_flag boolean;
  k text;
BEGIN
  IF perms IS NULL OR jsonb_typeof(perms) <> 'object' THEN
    RETURN jsonb_build_object(
      'is_complete', false,
      'missing_modules', to_jsonb(required_modules),
      'no_view_modules', to_jsonb(ARRAY[]::text[]),
      'empty_modules', to_jsonb(ARRAY[]::text[]),
      'total_required', array_length(required_modules,1)
    );
  END IF;

  FOREACH m IN ARRAY required_modules LOOP
    mod := perms -> m;
    IF mod IS NULL OR jsonb_typeof(mod) <> 'object' THEN
      missing_modules := array_append(missing_modules, m);
      CONTINUE;
    END IF;

    any_flag := false;
    FOREACH k IN ARRAY flag_keys LOOP
      IF COALESCE((mod ->> k)::boolean, false) THEN
        any_flag := true;
        EXIT;
      END IF;
    END LOOP;

    IF NOT any_flag THEN
      empty_modules := array_append(empty_modules, m);
    ELSIF NOT COALESCE((mod ->> 'can_view')::boolean, false) THEN
      no_view_modules := array_append(no_view_modules, m);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'is_complete', (array_length(missing_modules,1) IS NULL
                    AND array_length(empty_modules,1) IS NULL
                    AND array_length(no_view_modules,1) IS NULL),
    'missing_modules', to_jsonb(COALESCE(missing_modules, ARRAY[]::text[])),
    'no_view_modules', to_jsonb(COALESCE(no_view_modules, ARRAY[]::text[])),
    'empty_modules',   to_jsonb(COALESCE(empty_modules,   ARRAY[]::text[])),
    'total_required', array_length(required_modules,1)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_profile_template_completeness(jsonb) TO authenticated, anon;
