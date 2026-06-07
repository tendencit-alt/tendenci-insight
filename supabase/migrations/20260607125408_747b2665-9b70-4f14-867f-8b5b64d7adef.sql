
-- ============================================================
-- F1: Higieniza slugs dos estágios de produção do tenant Planejados
-- ============================================================
DO $f1$
DECLARE
  _t uuid := '11912d24-f3f2-41cb-8b35-d094352d5995';
  _maps text[][] := ARRAY[
    ['em_producao','caderno_executivo'],
    ['concluido','compras'],
    ['entregue','corte'],
    ['cancelado','separacao'],
    ['teste','montagem_interna'],
    ['ajustes','montagem_externa'],
    ['concluido_2','ajustes'],
    ['cancelado_2','concluido']
  ];
  i int;
  oldslug text;
  newslug text;
BEGIN
  -- Fase A: rotula com sufixo temporário para evitar colisões na UNIQUE(tenant_id, slug)
  FOR i IN 1..array_length(_maps,1) LOOP
    oldslug := _maps[i][1];
    UPDATE public.production_status_columns SET slug = oldslug || '__tmp'
      WHERE tenant_id = _t AND slug = oldslug;
    UPDATE public.production_orders SET status = oldslug || '__tmp'
      WHERE tenant_id = _t AND status = oldslug;
    UPDATE public.production_order_phase_history SET phase = oldslug || '__tmp'
      WHERE tenant_id = _t AND phase = oldslug;
    UPDATE public.production_order_phase_plan SET phase_slug = oldslug || '__tmp'
      WHERE tenant_id = _t AND phase_slug = oldslug;
  END LOOP;

  -- Fase B: aplica os slugs finais
  FOR i IN 1..array_length(_maps,1) LOOP
    oldslug := _maps[i][1];
    newslug := _maps[i][2];
    UPDATE public.production_status_columns SET slug = newslug
      WHERE tenant_id = _t AND slug = oldslug || '__tmp';
    UPDATE public.production_orders SET status = newslug
      WHERE tenant_id = _t AND status = oldslug || '__tmp';
    UPDATE public.production_order_phase_history SET phase = newslug
      WHERE tenant_id = _t AND phase = oldslug || '__tmp';
    UPDATE public.production_order_phase_plan SET phase_slug = newslug
      WHERE tenant_id = _t AND phase_slug = oldslug || '__tmp';
  END LOOP;

  -- Ajustes finos de label (acentuação correta)
  UPDATE public.production_status_columns SET label = 'Separação'
    WHERE tenant_id = _t AND slug = 'separacao';
  UPDATE public.production_status_columns SET label = 'Montagem Interna'
    WHERE tenant_id = _t AND slug = 'montagem_interna';
  UPDATE public.production_status_columns SET label = 'Concluído'
    WHERE tenant_id = _t AND slug = 'concluido';
END
$f1$;

-- ============================================================
-- F5: garante política de retrocesso configurada nos tenants
-- ============================================================
INSERT INTO public.tenant_customizations (tenant_id, workflow_config)
VALUES
  ('11912d24-f3f2-41cb-8b35-d094352d5995', jsonb_build_object('production.regress_policy', 'supervisor')),
  ('423ab4ec-9741-464b-948f-9edf6297e783', jsonb_build_object('production.regress_policy', 'supervisor'))
ON CONFLICT (tenant_id) DO UPDATE
  SET workflow_config = COALESCE(public.tenant_customizations.workflow_config, '{}'::jsonb)
                        || jsonb_build_object(
                             'production.regress_policy',
                             COALESCE(public.tenant_customizations.workflow_config->>'production.regress_policy', 'supervisor')
                           );

-- ============================================================
-- F6: move_production_phase passa a emitir cross_module_events
--     também em transições forward (não apenas regress)
-- ============================================================
CREATE OR REPLACE FUNCTION public.move_production_phase(_op_id uuid, _target_slug text, _reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _op record;
  _cur_order int;
  _tgt_order int;
  _dir text;
  _can boolean;
  _pending int;
  _from_status text;
BEGIN
  SELECT * INTO _op FROM public.production_orders WHERE id = _op_id;
  IF _op.id IS NULL THEN
    RAISE EXCEPTION 'OP não encontrada' USING ERRCODE='P0002';
  END IF;
  IF _op.status = _target_slug THEN
    RETURN jsonb_build_object('ok', true, 'noop', true);
  END IF;

  _from_status := _op.status;

  SELECT sort_order INTO _cur_order FROM public.production_status_columns
    WHERE tenant_id = _op.tenant_id AND slug = _op.status;
  SELECT sort_order INTO _tgt_order FROM public.production_status_columns
    WHERE tenant_id = _op.tenant_id AND slug = _target_slug;
  IF _tgt_order IS NULL THEN
    RAISE EXCEPTION 'Fase destino % inexistente para o tenant', _target_slug;
  END IF;

  _dir := CASE WHEN COALESCE(_cur_order, -1) > _tgt_order THEN 'regress' ELSE 'forward' END;

  IF _dir = 'forward' THEN
    SELECT count(*) INTO _pending
    FROM public.production_status_checklist_items ci
    LEFT JOIN public.production_order_checklist_progress pr
      ON pr.checklist_item_id = ci.id AND pr.production_order_id = _op_id
    WHERE ci.tenant_id = _op.tenant_id
      AND ci.status_slug = _op.status
      AND ci.active = true
      AND ci.required = true
      AND COALESCE(pr.completed, false) = false;
    IF _pending > 0 THEN
      RAISE EXCEPTION 'Checklist da fase "%": % item(ns) obrigatório(s) pendente(s). Conclua antes de avançar.', _op.status, _pending USING ERRCODE='P0001';
    END IF;
  END IF;

  IF _dir = 'regress' THEN
    IF _reason IS NULL OR length(trim(_reason)) < 10 THEN
      RAISE EXCEPTION 'Retrocesso exige justificativa (mínimo 10 caracteres)' USING ERRCODE='P0001';
    END IF;
    SELECT public.can_regress_production_phase(_op.tenant_id) INTO _can;
    IF _can IS NOT TRUE THEN
      RAISE EXCEPTION 'Sem permissão para retroceder fase neste tenant' USING ERRCODE='42501';
    END IF;
  END IF;

  PERFORM set_config('app.phase_move_reason', COALESCE(_reason,''), true);

  UPDATE public.production_orders
     SET status = _target_slug, status_changed_at = now(), updated_at = now()
   WHERE id = _op_id;

  PERFORM set_config('app.phase_move_reason', '', true);

  -- F6: emit cross_module_event em qualquer transição
  INSERT INTO public.cross_module_events(
    tenant_id, event_type, source_module, target_module,
    source_entity, source_entity_id, payload, created_by
  )
  VALUES (
    _op.tenant_id,
    CASE WHEN _dir = 'regress' THEN 'production.phase_regress' ELSE 'production.phase_forward' END,
    'producao',
    CASE WHEN _dir = 'regress' THEN 'governanca' ELSE 'orders' END,
    'production_orders',
    _op_id,
    jsonb_build_object('from', _from_status, 'to', _target_slug, 'reason', _reason, 'direction', _dir),
    auth.uid()
  );

  IF _dir = 'regress' THEN
    INSERT INTO public.erp_notifications(tenant_id, user_id, module, category, title, message, entity_table, entity_id, priority, generated_by)
    SELECT _op.tenant_id, p.id, 'producao', 'governance',
           'Retrocesso de fase em OP #' || _op.order_number,
           'OP retrocedeu de "' || _from_status || '" para "' || _target_slug || '". Motivo: ' || _reason,
           'production_orders', _op_id, 'alta', 'trigger:move_production_phase'
    FROM public.profiles p
    WHERE p.tenant_id = _op.tenant_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'direction', _dir, 'from', _from_status, 'to', _target_slug);
END;
$function$;
