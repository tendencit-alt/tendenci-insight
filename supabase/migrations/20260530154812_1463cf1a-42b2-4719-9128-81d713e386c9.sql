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
  SELECT COALESCE((workflow_config->>'production.regress_policy'), 'supervisor')
    INTO _policy
  FROM public.tenant_customizations
  WHERE tenant_id = _tenant_id;
  _policy := COALESCE(_policy, 'supervisor');

  IF _policy = 'livre' THEN RETURN true; END IF;

  SELECT role, COALESCE(is_owner,false) INTO _role, _is_owner
  FROM public.profiles WHERE id = auth.uid();

  IF COALESCE(_is_owner,false) THEN RETURN true; END IF;

  IF _role IS NULL THEN RETURN false; END IF;

  IF _policy = 'admin' THEN
    RETURN _role IN ('admin','owner','tenant_owner');
  END IF;

  RETURN _role IN ('admin','owner','tenant_owner','gestor');
END;
$function$;

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
BEGIN
  SELECT * INTO _op FROM public.production_orders WHERE id = _op_id;
  IF _op.id IS NULL THEN
    RAISE EXCEPTION 'OP não encontrada' USING ERRCODE='P0002';
  END IF;
  IF _op.status = _target_slug THEN
    RETURN jsonb_build_object('ok', true, 'noop', true);
  END IF;

  SELECT sort_order INTO _cur_order FROM public.production_status_columns
    WHERE tenant_id = _op.tenant_id AND slug = _op.status;
  SELECT sort_order INTO _tgt_order FROM public.production_status_columns
    WHERE tenant_id = _op.tenant_id AND slug = _target_slug;
  IF _tgt_order IS NULL THEN
    RAISE EXCEPTION 'Fase destino % inexistente para o tenant', _target_slug;
  END IF;

  _dir := CASE WHEN COALESCE(_cur_order, -1) > _tgt_order THEN 'regress' ELSE 'forward' END;

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

  IF _dir = 'regress' THEN
    INSERT INTO public.audit_log(tenant_id, user_id, table_name, record_id, event_type, event_source, metadata)
    VALUES (_op.tenant_id, auth.uid(), 'production_orders', _op_id::text, 'phase_regress', 'rpc:move_production_phase',
            jsonb_build_object('from', _op.status, 'to', _target_slug, 'reason', _reason));

    INSERT INTO public.cross_module_events(tenant_id, event_type, source_module, target_module, source_entity, source_entity_id, payload, created_by)
    VALUES (_op.tenant_id, 'production.phase_regress', 'producao', 'governanca', 'production_orders', _op_id,
            jsonb_build_object('from', _op.status, 'to', _target_slug, 'reason', _reason), auth.uid());

    INSERT INTO public.erp_notifications(tenant_id, user_id, module, category, title, message, entity_table, entity_id, priority, generated_by)
    SELECT _op.tenant_id, p.id, 'producao', 'governance',
           'Retrocesso de fase em OP #' || _op.order_number,
           'OP retrocedeu de "' || _op.status || '" para "' || _target_slug || '". Motivo: ' || _reason,
           'production_orders', _op_id, 'high', 'trigger:move_production_phase'
    FROM public.profiles p
    WHERE p.tenant_id = _op.tenant_id AND p.role IN ('admin','owner','tenant_owner','gestor');
  END IF;

  RETURN jsonb_build_object('ok', true, 'direction', _dir, 'from', _op.status, 'to', _target_slug);
END;
$function$;