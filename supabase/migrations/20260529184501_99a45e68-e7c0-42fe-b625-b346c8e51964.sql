
-- 1) Extend status transition validator to support 'entrega_parcial'
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_valid_transitions jsonb;
  v_allowed text[];
  v_is_admin boolean;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  v_is_admin := public.is_tenant_admin(OLD.tenant_id);

  v_valid_transitions := jsonb_build_object(
    'rascunho',              '["ativo", "em_negociacao", "aprovado", "cancelado"]',
    'ativo',                 '["em_negociacao", "aprovado", "cancelado"]',
    'em_negociacao',         '["ativo", "aprovado", "rascunho", "cancelado"]',
    'aprovado',              '["liberado_producao", "em_producao", "faturado", "cancelado"]',
    'liberado_producao',     '["em_producao", "cancelado"]',
    'em_producao',           '["producao_concluida"]',
    'producao_concluida',    '["liberado_faturamento", "faturado"]',
    'liberado_faturamento',  '["faturado"]',
    'faturado',              '["entregue", "entrega_parcial"]',
    'entrega_parcial',       '["entregue"]',
    'entregue',              '["encerrado"]',
    'encerrado',             '[]',
    'cancelado',             '["rascunho"]'
  );

  SELECT array_agg(val::text) INTO v_allowed
  FROM jsonb_array_elements_text((v_valid_transitions ->> OLD.status)::jsonb) AS val;

  IF NOT v_is_admin THEN
    IF v_allowed IS NULL OR NOT (NEW.status = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'Transição de status inválida: % → %. Transições permitidas: %',
        OLD.status, NEW.status, COALESCE(array_to_string(v_allowed, ', '), 'nenhuma');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Rewrite fulfillment_evaluate_order_status to auto-promote through full state machine
CREATE OR REPLACE FUNCTION public.fulfillment_evaluate_order_status(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant uuid;
  v_status text;
  v_total_del int;
  v_done_del  int;
  v_total_ins int;
  v_done_ins  int;
  v_target text;
  v_path text[] := ARRAY['aprovado','liberado_producao','em_producao','producao_concluida','liberado_faturamento','faturado'];
  v_idx_current int;
  v_idx_faturado int := 6;
  v_step text;
  v_prev text;
  v_recv_count int;
BEGIN
  IF _order_id IS NULL THEN RETURN; END IF;

  SELECT tenant_id, status INTO v_tenant, v_status
  FROM public.orders WHERE id = _order_id;

  IF v_tenant IS NULL THEN
    INSERT INTO public.audit_log(tenant_id, table_name, record_id, event_type, event_source, metadata)
    VALUES (NULL, 'orders', _order_id::text, 'auto_promote_error', 'fulfillment_evaluate_order_status',
            jsonb_build_object('error','order_not_found','order_id', _order_id));
    RETURN;
  END IF;

  -- never override final or cancelled states
  IF v_status IN ('entregue','encerrado','cancelado') THEN RETURN; END IF;

  SELECT count(*), count(*) FILTER (WHERE status = 'entregue')
    INTO v_total_del, v_done_del
  FROM public.delivery_orders
  WHERE order_id = _order_id AND tenant_id = v_tenant;

  SELECT count(*), count(*) FILTER (WHERE status = 'concluida')
    INTO v_total_ins, v_done_ins
  FROM public.installation_orders
  WHERE order_id = _order_id AND tenant_id = v_tenant;

  IF (v_total_del + v_total_ins) = 0 THEN RETURN; END IF;

  -- Decide final target: full 'entregue' vs intermediate 'entrega_parcial'
  IF (v_total_del = 0 OR v_done_del = v_total_del)
     AND (v_total_ins = 0 OR v_done_ins = v_total_ins) THEN
    v_target := 'entregue';
  ELSIF v_done_del > 0 OR v_done_ins > 0 THEN
    v_target := 'entrega_parcial';
  ELSE
    RETURN;
  END IF;

  -- Special early exit: already at entrega_parcial and target is still entrega_parcial → no-op
  IF v_status = 'entrega_parcial' AND v_target = 'entrega_parcial' THEN RETURN; END IF;

  -- Locate current position on canonical path
  v_idx_current := array_position(v_path, v_status);

  -- If current is unknown (rascunho/ativo/em_negociacao) → bring it onto path at 'aprovado'
  IF v_idx_current IS NULL AND v_status <> 'entrega_parcial' THEN
    v_idx_current := 0; -- will start stepping into v_path[1]='aprovado'
  END IF;

  -- Walk through each remaining path step up to and including 'faturado'
  IF v_status <> 'entrega_parcial' THEN
    FOR i IN GREATEST(COALESCE(v_idx_current,0)+1, 1) .. v_idx_faturado LOOP
      v_step := v_path[i];
      SELECT status INTO v_prev FROM public.orders WHERE id = _order_id;
      IF v_prev = v_step THEN CONTINUE; END IF;
      IF v_prev IN ('entregue','encerrado','cancelado') THEN EXIT; END IF;

      -- Receivable dedup check when entering 'faturado'
      IF v_step = 'faturado' THEN
        SELECT count(*) INTO v_recv_count
          FROM public.fin_receivables
         WHERE order_id = _order_id AND tenant_id = v_tenant
           AND COALESCE(status,'') NOT IN ('cancelado','cancelled');
        IF v_recv_count > 0 THEN
          INSERT INTO public.cross_module_events
            (tenant_id, event_type, source_module, target_module,
             source_entity, source_entity_id, target_entity, target_entity_id, payload, status)
          VALUES (v_tenant, 'receivable_skipped_already_exists', 'fulfillment', 'financeiro_ar',
                  'orders', _order_id, 'fin_receivables', _order_id,
                  jsonb_build_object('order_id', _order_id, 'existing_count', v_recv_count), 'processed');
        END IF;
      END IF;

      UPDATE public.orders
         SET status = v_step, updated_at = now()
       WHERE id = _order_id AND tenant_id = v_tenant
         AND status NOT IN ('entregue','encerrado','cancelado');

      IF FOUND THEN
        INSERT INTO public.audit_log
          (tenant_id, table_name, record_id, event_type, event_source, field_name, old_value, new_value, metadata)
        VALUES (v_tenant, 'orders', _order_id::text, 'auto_promote', 'fulfillment_evaluate_order_status',
                'status', v_prev, v_step,
                jsonb_build_object('origin','delivery_completion','order_id', _order_id,
                                   'previous_status', v_prev, 'new_status', v_step));

        INSERT INTO public.cross_module_events
          (tenant_id, event_type, source_module, target_module,
           source_entity, source_entity_id, target_entity, target_entity_id, payload, status)
        VALUES (v_tenant, 'order_auto_promoted', 'fulfillment', 'orders',
                'orders', _order_id, 'orders', _order_id,
                jsonb_build_object('previous_status', v_prev, 'new_status', v_step,
                                   'origin','delivery_completion'), 'processed');
      END IF;
    END LOOP;
  END IF;

  -- Final step: from 'faturado' (or 'entrega_parcial') decide whether to go to entregue or entrega_parcial
  SELECT status INTO v_prev FROM public.orders WHERE id = _order_id;
  IF v_prev IN ('entregue','encerrado','cancelado') THEN RETURN; END IF;

  IF v_target = 'entregue' THEN
    UPDATE public.orders
       SET status = 'entregue', data_entrega_realizada = COALESCE(data_entrega_realizada, CURRENT_DATE), updated_at = now()
     WHERE id = _order_id AND tenant_id = v_tenant
       AND status NOT IN ('entregue','encerrado','cancelado');
  ELSIF v_target = 'entrega_parcial' AND v_prev = 'faturado' THEN
    UPDATE public.orders
       SET status = 'entrega_parcial', updated_at = now()
     WHERE id = _order_id AND tenant_id = v_tenant
       AND status = 'faturado';
  ELSE
    RETURN;
  END IF;

  IF FOUND THEN
    INSERT INTO public.audit_log
      (tenant_id, table_name, record_id, event_type, event_source, field_name, old_value, new_value, metadata)
    VALUES (v_tenant, 'orders', _order_id::text, 'auto_promote', 'fulfillment_evaluate_order_status',
            'status', v_prev, v_target,
            jsonb_build_object('origin','delivery_completion','order_id', _order_id,
                               'previous_status', v_prev, 'new_status', v_target,
                               'total_deliveries', v_total_del, 'done_deliveries', v_done_del,
                               'total_installations', v_total_ins, 'done_installations', v_done_ins));

    INSERT INTO public.cross_module_events
      (tenant_id, event_type, source_module, target_module,
       source_entity, source_entity_id, target_entity, target_entity_id, payload, status)
    VALUES (v_tenant,
            CASE WHEN v_target='entregue' THEN 'order_auto_delivered' ELSE 'order_partial_delivered' END,
            'fulfillment', 'orders',
            'orders', _order_id, 'orders', _order_id,
            jsonb_build_object('previous_status', v_prev, 'new_status', v_target,
                               'total_deliveries', v_total_del, 'done_deliveries', v_done_del,
                               'total_installations', v_total_ins, 'done_installations', v_done_ins),
            'processed');
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.fulfillment_evaluate_order_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fulfillment_evaluate_order_status(uuid) TO authenticated, service_role;
