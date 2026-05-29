
DO $$
DECLARE
  v_tid uuid := '25765b2a-aaa7-4ea4-b715-1768e1f80224';
  r record; v_col text; v_pass int := 0; v_remaining int;
BEGIN
  ALTER TABLE public.fin_cost_centers DISABLE TRIGGER protect_cost_center_defaults;
  ALTER TABLE public.fin_cost_centers DISABLE TRIGGER trg_block_delete_parent_cost_center;
  ALTER TABLE public.fin_chart_accounts DISABLE TRIGGER protect_chart_account_core;

  LOOP
    v_pass := v_pass + 1;
    EXIT WHEN v_pass > 6;
    FOR r IN
      SELECT DISTINCT conrelid::regclass::text AS tbl
      FROM pg_constraint WHERE confrelid='public.tenants'::regclass AND contype='f'
    LOOP
      FOR v_col IN
        SELECT a.attname FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
        WHERE c.confrelid='public.tenants'::regclass AND c.contype='f' AND c.conrelid=r.tbl::regclass
      LOOP
        BEGIN
          EXECUTE format('DELETE FROM %s WHERE %I = %L', r.tbl, v_col, v_tid);
        EXCEPTION WHEN OTHERS THEN NULL; END;
      END LOOP;
    END LOOP;
    -- conta remanescentes
    v_remaining := 0;
    FOR r IN SELECT DISTINCT conrelid::regclass::text AS tbl FROM pg_constraint WHERE confrelid='public.tenants'::regclass AND contype='f'
    LOOP
      FOR v_col IN SELECT a.attname FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
        WHERE c.confrelid='public.tenants'::regclass AND c.contype='f' AND c.conrelid=r.tbl::regclass
      LOOP
        BEGIN
          EXECUTE format('SELECT count(*) FROM %s WHERE %I = %L', r.tbl, v_col, v_tid) INTO STRICT v_remaining;
          EXIT WHEN v_remaining > 0;
        EXCEPTION WHEN OTHERS THEN NULL; END;
      END LOOP;
      EXIT WHEN v_remaining > 0;
    END LOOP;
    EXIT WHEN v_remaining = 0;
  END LOOP;

  DELETE FROM public.tenants WHERE id=v_tid;

  ALTER TABLE public.fin_cost_centers ENABLE TRIGGER protect_cost_center_defaults;
  ALTER TABLE public.fin_cost_centers ENABLE TRIGGER trg_block_delete_parent_cost_center;
  ALTER TABLE public.fin_chart_accounts ENABLE TRIGGER protect_chart_account_core;
END $$;
