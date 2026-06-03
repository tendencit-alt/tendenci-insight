
CREATE TABLE public.production_status_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  status_slug text NOT NULL,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  required boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_status_checklist_items TO authenticated;
GRANT ALL ON public.production_status_checklist_items TO service_role;

CREATE INDEX idx_pscli_tenant_slug ON public.production_status_checklist_items(tenant_id, status_slug);

ALTER TABLE public.production_status_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_checklist_items" ON public.production_status_checklist_items
  FOR SELECT TO authenticated
  USING (is_owner() OR tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_write_checklist_items" ON public.production_status_checklist_items
  FOR ALL TO authenticated
  USING (is_owner() OR tenant_id = get_user_tenant_id())
  WITH CHECK (is_owner() OR tenant_id = get_user_tenant_id());

CREATE TRIGGER trg_set_tenant_pscli BEFORE INSERT ON public.production_status_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER trg_updated_at_pscli BEFORE UPDATE ON public.production_status_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.production_order_checklist_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  production_order_id uuid NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  checklist_item_id uuid NOT NULL REFERENCES public.production_status_checklist_items(id) ON DELETE CASCADE,
  status_slug text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_by uuid,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (production_order_id, checklist_item_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_order_checklist_progress TO authenticated;
GRANT ALL ON public.production_order_checklist_progress TO service_role;

CREATE INDEX idx_pocp_op ON public.production_order_checklist_progress(production_order_id, status_slug);

ALTER TABLE public.production_order_checklist_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_pocp" ON public.production_order_checklist_progress
  FOR SELECT TO authenticated
  USING (is_owner() OR tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_write_pocp" ON public.production_order_checklist_progress
  FOR ALL TO authenticated
  USING (is_owner() OR tenant_id = get_user_tenant_id())
  WITH CHECK (is_owner() OR tenant_id = get_user_tenant_id());

CREATE TRIGGER trg_set_tenant_pocp BEFORE INSERT ON public.production_order_checklist_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER trg_updated_at_pocp BEFORE UPDATE ON public.production_order_checklist_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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
           'production_orders', _op_id, 'alta', 'trigger:move_production_phase'
    FROM public.profiles p
    WHERE p.tenant_id = _op.tenant_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'direction', _dir);
END;
$function$;
