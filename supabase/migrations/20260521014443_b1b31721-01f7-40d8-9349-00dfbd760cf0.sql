
UPDATE public.fin_cost_centers SET code = '500' WHERE code = '900' AND name = 'Administrativo';
UPDATE public.fin_cost_centers SET code = '510' WHERE code = '910' AND name = 'Administrativo Interno';
UPDATE public.fin_cost_centers SET code = '520' WHERE code = '920' AND name = 'Administrativo Externo';

CREATE OR REPLACE FUNCTION public.seed_default_cost_centers(_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  v_parent_id uuid;
  parent_rec record;
  child_rec record;
BEGIN
  IF _tenant_id IS NULL THEN
    RETURN 0;
  END IF;

  FOR parent_rec IN
    SELECT * FROM (VALUES
      ('100', 'Produção'),
      ('200', 'Manutenção'),
      ('300', 'Logística'),
      ('400', 'Comercial'),
      ('500', 'Administrativo')
    ) AS t(code, name)
  LOOP
    SELECT id INTO v_parent_id
    FROM public.fin_cost_centers
    WHERE tenant_id = _tenant_id AND code = parent_rec.code
    LIMIT 1;

    IF v_parent_id IS NULL THEN
      INSERT INTO public.fin_cost_centers (tenant_id, code, name, active, is_system_default, parent_id)
      VALUES (_tenant_id, parent_rec.code, parent_rec.name, true, true, NULL)
      RETURNING id INTO v_parent_id;
      v_count := v_count + 1;
    END IF;

    FOR child_rec IN
      SELECT * FROM (VALUES
        (parent_rec.code, parent_rec.name)
      ) AS p(pcode, pname),
      LATERAL (VALUES
        ((p.pcode::int + 10)::text, p.pname || ' Interna'),
        ((p.pcode::int + 20)::text, p.pname || ' Externa')
      ) AS c(ccode, cname)
    LOOP
      DECLARE
        v_child_name text := child_rec.cname;
      BEGIN
        IF parent_rec.name IN ('Comercial', 'Administrativo') THEN
          v_child_name := replace(replace(child_rec.cname, ' Interna', ' Interno'), ' Externa', ' Externo');
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM public.fin_cost_centers
          WHERE tenant_id = _tenant_id AND code = child_rec.ccode
        ) THEN
          INSERT INTO public.fin_cost_centers (tenant_id, code, name, active, is_system_default, parent_id)
          VALUES (_tenant_id, child_rec.ccode, v_child_name, true, true, v_parent_id);
          v_count := v_count + 1;
        END IF;
      END;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;
