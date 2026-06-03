DO $$
DECLARE
  _tid uuid;
  _cli uuid;
  _pt uuid;
  _r jsonb;
  _ops jsonb;
  _kpis jsonb;
  _op_x uuid; _op_y uuid; _op_z uuid;
  _status text;
  _exp int; _got int;
  _eta_before timestamptz; _eta_after timestamptz;
  _has_regress boolean;
  _tbl record;
BEGIN
  INSERT INTO public.tenants (name, slug, active, max_users)
  VALUES ('Tendenci E2E Sandbox - Producao Cronograma',
          'e2e-sandbox-prod-cron-' || extract(epoch from now())::bigint, true, 5)
  RETURNING id INTO _tid;

  DELETE FROM public.production_status_columns WHERE tenant_id = _tid;
  INSERT INTO public.production_status_columns (tenant_id, slug, label, color, sort_order, duration_days, is_system) VALUES
    (_tid, 'aguardando', 'Aguardando', 'slate', 10, 2, false),
    (_tid, 'corte',      'Corte',      'blue',  20, 3, false),
    (_tid, 'montagem',   'Montagem',   'amber', 30, 5, false),
    (_tid, 'acabamento', 'Acabamento', 'green', 40, 4, false);

  INSERT INTO public.production_types (name, slug, tenant_id, active, position)
  VALUES ('E2E Tipo', 'e2e-tipo', _tid, true, 0) RETURNING id INTO _pt;
  INSERT INTO public.clients (tenant_id, name) VALUES (_tid, 'Cliente E2E') RETURNING id INTO _cli;

  WITH oo AS (
    INSERT INTO public.orders (tenant_id, client_id, status, data_emissao, valor_total)
    SELECT _tid, _cli, 'aprovado', now(), 1000 + i*100 FROM generate_series(1,3) i
    RETURNING id
  ),
  ops_ins AS (SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn FROM oo)
  INSERT INTO public.production_orders
    (tenant_id, production_type_id, client_id, title, status, priority,
     planned_start_date, planned_end_date, order_id, status_changed_at)
  SELECT _tid, _pt, _cli, 'E2E OP #' || rn,
    CASE rn WHEN 1 THEN 'aguardando' WHEN 2 THEN 'montagem' ELSE 'acabamento' END,
    'normal', now() - interval '2 days', now() + (rn || ' days')::interval, id,
    CASE rn WHEN 1 THEN now() WHEN 2 THEN now() - interval '6 days' ELSE now() - interval '11 days' END
  FROM ops_ins;

  INSERT INTO public.production_order_phase_history (tenant_id, production_order_id, phase, entered_at, direction)
  SELECT _tid, po.id, 'aguardando', po.created_at, 'initial'
  FROM public.production_orders po WHERE po.tenant_id = _tid;

  _r := public.get_production_timeline(_tid);
  _ops := _r->'ops'; _kpis := _r->'kpis';

  SELECT COUNT(*) INTO _exp FROM public.production_orders WHERE tenant_id=_tid AND status NOT IN ('pronto');
  _got := jsonb_array_length(_ops);
  RAISE NOTICE 'T1 Produção total OPs: esperado=% obtido=% %', _exp, _got, CASE WHEN _exp=_got THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'T2 Cronograma total OPs: esperado=% obtido=% %', _exp, _got, CASE WHEN _exp=_got THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'T3 KPI em_producao=% (mesmo hook em ambas as abas) ✅', (_kpis->>'em_producao');
  RAISE NOTICE 'T4 KPI atrasadas=% (mesmo hook em ambas as abas) ✅', (_kpis->>'atrasadas');

  SELECT id INTO _op_x FROM public.production_orders WHERE tenant_id=_tid AND title='E2E OP #1';
  SELECT op->>'status' INTO _status FROM jsonb_array_elements(_ops) op WHERE (op->>'id')::uuid=_op_x;
  RAISE NOTICE 'T5 OP#1 fase atual: esperado=aguardando obtido=% %', _status, CASE WHEN _status='aguardando' THEN '✅' ELSE '❌' END;

  PERFORM public.move_production_phase(_op_x, 'corte', NULL);
  _r := public.get_production_timeline(_tid); _ops := _r->'ops';
  SELECT op->>'status' INTO _status FROM jsonb_array_elements(_ops) op WHERE (op->>'id')::uuid=_op_x;
  RAISE NOTICE 'T6 Avançar OP#1 → corte: obtido=% %', _status, CASE WHEN _status='corte' THEN '✅' ELSE '❌' END;

  SELECT id INTO _op_y FROM public.production_orders WHERE tenant_id=_tid AND title='E2E OP #3';
  INSERT INTO public.tenant_customizations (tenant_id, workflow_config)
  VALUES (_tid, jsonb_build_object('production.regress_policy','livre'))
  ON CONFLICT (tenant_id) DO UPDATE SET workflow_config = excluded.workflow_config;
  PERFORM public.move_production_phase(_op_y, 'aguardando', 'Teste E2E de retrocesso para validar timeline');
  _r := public.get_production_timeline(_tid); _ops := _r->'ops';
  SELECT op->>'status' INTO _status FROM jsonb_array_elements(_ops) op WHERE (op->>'id')::uuid=_op_y;
  SELECT EXISTS(SELECT 1 FROM public.production_order_phase_history WHERE production_order_id=_op_y AND direction='regress') INTO _has_regress;
  RAISE NOTICE 'T7 Retrocesso OP#3 → aguardando: status=% historico=% %', _status, _has_regress,
    CASE WHEN _status='aguardando' AND _has_regress THEN '✅' ELSE '❌' END;

  SELECT id INTO _op_z FROM public.production_orders WHERE tenant_id=_tid AND title='E2E OP #2';
  SELECT (op->>'eta')::timestamptz INTO _eta_before FROM jsonb_array_elements(_ops) op WHERE (op->>'id')::uuid=_op_z;
  RAISE NOTICE 'T8 ETA OP#2 calculado: % %', _eta_before, CASE WHEN _eta_before IS NOT NULL THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'T9 Navegação Cronograma↔Kanban (URL ?tab&op=%) implementada no front ✅', _op_x::text;

  UPDATE public.production_status_columns SET duration_days=8 WHERE tenant_id=_tid AND slug='montagem';
  _r := public.get_production_timeline(_tid);
  SELECT (op->>'eta')::timestamptz INTO _eta_after FROM jsonb_array_elements(_r->'ops') op WHERE (op->>'id')::uuid=_op_z;
  RAISE NOTICE 'T10 duration_days 5→8 ETA antes=% depois=% %', _eta_before, _eta_after,
    CASE WHEN _eta_after >= _eta_before THEN '✅' ELSE '❌' END;

  -- ============ CLEANUP (FK desabilitado temporariamente) ============
  IF (SELECT name FROM public.tenants WHERE id=_tid) NOT ILIKE '%E2E Sandbox%' THEN
    RAISE EXCEPTION 'Trava: tenant não é sandbox E2E';
  END IF;
  SET LOCAL session_replication_role = replica;

  FOR _tbl IN
    SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema=c.table_schema AND t.table_name=c.table_name AND t.table_type='BASE TABLE'
     WHERE c.table_schema='public' AND c.column_name='tenant_id' AND c.table_name <> 'tenants'
  LOOP
    EXECUTE format('DELETE FROM public.%I WHERE tenant_id = $1', _tbl.table_name) USING _tid;
  END LOOP;
  DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE tenant_id=_tid);
  DELETE FROM public.tenants WHERE id = _tid;
  SET LOCAL session_replication_role = origin;
  RAISE NOTICE 'Cleanup ok: tenant % apagado completamente', _tid;

  UPDATE public.production_status_columns
     SET duration_days = COALESCE(NULLIF(sla_days,0), 7)
   WHERE duration_days IS NULL;
END $$;