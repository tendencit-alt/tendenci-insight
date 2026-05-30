
-- ============================================================
-- PRODUÇÃO: Trava de Prazo + Histórico de Fases + Move RPC
-- ============================================================

-- 1) HISTÓRICO DE FASES =====================================
CREATE TABLE IF NOT EXISTS public.production_order_phase_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  production_order_id uuid NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  phase text NOT NULL,
  entered_at timestamptz NOT NULL DEFAULT now(),
  exited_at timestamptz,
  moved_by uuid,
  direction text NOT NULL CHECK (direction IN ('forward','regress','initial')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.production_order_phase_history TO authenticated;
GRANT ALL ON public.production_order_phase_history TO service_role;

ALTER TABLE public.production_order_phase_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "phase_history_select_tenant"
  ON public.production_order_phase_history FOR SELECT TO authenticated
  USING (
    public.is_owner()
    OR tenant_id = (SELECT current_tenant_id FROM public.profiles WHERE id = auth.uid())
    OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "phase_history_insert_tenant"
  ON public.production_order_phase_history FOR INSERT TO authenticated
  WITH CHECK (
    public.is_owner()
    OR tenant_id = (SELECT current_tenant_id FROM public.profiles WHERE id = auth.uid())
    OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS ix_pophh_op_entered
  ON public.production_order_phase_history (production_order_id, entered_at DESC);
CREATE INDEX IF NOT EXISTS ix_pophh_tenant
  ON public.production_order_phase_history (tenant_id);
CREATE INDEX IF NOT EXISTS ix_pophh_open
  ON public.production_order_phase_history (production_order_id)
  WHERE exited_at IS NULL;

-- 2) HELPER: usuário pode aprovar retrocesso =================
CREATE OR REPLACE FUNCTION public.can_regress_production_phase(_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
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

  IF _is_owner THEN RETURN true; END IF;

  IF _policy = 'admin' THEN
    RETURN _role IN ('admin','owner','tenant_owner');
  END IF;

  -- 'supervisor': admin / owner / tenant_owner
  RETURN _role IN ('admin','owner','tenant_owner');
END;
$$;

-- 3) TRIGGER: log automático na production_orders ============
CREATE OR REPLACE FUNCTION public.log_production_phase_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _old_order int;
  _new_order int;
  _dir text;
  _reason text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.production_order_phase_history
      (tenant_id, production_order_id, phase, entered_at, direction, moved_by)
    VALUES (NEW.tenant_id, NEW.id, NEW.status, COALESCE(NEW.created_at, now()), 'initial', NEW.created_by);
    RETURN NEW;
  END IF;

  -- UPDATE: só registra se status mudou
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT sort_order INTO _old_order FROM public.production_status_columns
      WHERE tenant_id = NEW.tenant_id AND slug = OLD.status LIMIT 1;
    SELECT sort_order INTO _new_order FROM public.production_status_columns
      WHERE tenant_id = NEW.tenant_id AND slug = NEW.status LIMIT 1;

    _dir := CASE
      WHEN _old_order IS NULL OR _new_order IS NULL THEN 'forward'
      WHEN _new_order < _old_order THEN 'regress'
      ELSE 'forward'
    END;

    _reason := NULLIF(current_setting('app.phase_move_reason', true), '');

    -- fecha o registro aberto anterior
    UPDATE public.production_order_phase_history
       SET exited_at = now()
     WHERE production_order_id = NEW.id AND exited_at IS NULL;

    INSERT INTO public.production_order_phase_history
      (tenant_id, production_order_id, phase, entered_at, direction, moved_by, reason)
    VALUES (NEW.tenant_id, NEW.id, NEW.status, now(), _dir, auth.uid(), _reason);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_production_phase ON public.production_orders;
CREATE TRIGGER trg_log_production_phase
  AFTER INSERT OR UPDATE OF status ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.log_production_phase_change();

-- 4) TRAVA DO planned_end_date (proxy de due_date) ===========
CREATE OR REPLACE FUNCTION public.lock_production_due_date()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _bypass text;
BEGIN
  IF OLD.planned_end_date IS NOT DISTINCT FROM NEW.planned_end_date THEN
    RETURN NEW;
  END IF;
  _bypass := current_setting('app.allow_due_date_change', true);
  IF _bypass = 'true' THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'planned_end_date imutável. Use reprogram_op() com justificativa.'
    USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_production_due_date ON public.production_orders;
CREATE TRIGGER trg_lock_production_due_date
  BEFORE UPDATE OF planned_end_date ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.lock_production_due_date();

-- 5) RPC: mover fase (dropdown + drag-drop) ==================
CREATE OR REPLACE FUNCTION public.move_production_phase(
  _op_id uuid, _target_slug text, _reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
    IF NOT _can THEN
      RAISE EXCEPTION 'Sem permissão para retroceder fase neste tenant' USING ERRCODE='42501';
    END IF;
  END IF;

  -- passa reason para o trigger via GUC local
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
     WHERE p.tenant_id = _op.tenant_id AND p.role IN ('admin','owner','tenant_owner');
  END IF;

  RETURN jsonb_build_object('ok', true, 'direction', _dir, 'from', _op.status, 'to', _target_slug);
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_production_phase(uuid, text, text) TO authenticated;

-- 6) RPC: reprogramar prazo (única forma de mudar planned_end_date) ====
CREATE OR REPLACE FUNCTION public.reprogram_op(
  _op_id uuid, _new_due_date timestamptz, _reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _old timestamptz;
  _tenant_id uuid;
BEGIN
  IF _reason IS NULL OR length(trim(_reason)) < 10 THEN
    RAISE EXCEPTION 'Reprogramação exige justificativa (mínimo 10 caracteres)' USING ERRCODE='P0001';
  END IF;
  SELECT planned_end_date, tenant_id INTO _old, _tenant_id
    FROM public.production_orders WHERE id = _op_id;
  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'OP não encontrada' USING ERRCODE='P0002';
  END IF;

  PERFORM set_config('app.allow_due_date_change', 'true', true);
  UPDATE public.production_orders
     SET planned_end_date = _new_due_date, updated_at = now()
   WHERE id = _op_id;
  PERFORM set_config('app.allow_due_date_change', 'false', true);

  INSERT INTO public.audit_log(tenant_id, user_id, table_name, record_id, event_type, event_source, old_value, new_value, metadata)
  VALUES (_tenant_id, auth.uid(), 'production_orders', _op_id::text, 'reprogram_op', 'rpc:reprogram_op',
          _old::text, _new_due_date::text,
          jsonb_build_object('previous_due_date', _old, 'new_due_date', _new_due_date, 'reason', _reason));

  RETURN jsonb_build_object('ok', true, 'previous', _old, 'new', _new_due_date);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reprogram_op(uuid, timestamptz, text) TO authenticated;

-- 7) BACKFILL: 1 registro 'initial' para OPs sem histórico ====
INSERT INTO public.production_order_phase_history
  (tenant_id, production_order_id, phase, entered_at, direction, moved_by)
SELECT po.tenant_id, po.id, po.status, COALESCE(po.created_at, now()), 'initial', po.created_by
FROM public.production_orders po
LEFT JOIN public.production_order_phase_history h ON h.production_order_id = po.id
WHERE h.id IS NULL AND po.tenant_id IS NOT NULL;
