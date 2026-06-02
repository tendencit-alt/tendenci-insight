-- Allow logging deadline reprogramming events in the same phase history timeline
ALTER TABLE public.production_order_phase_history
  DROP CONSTRAINT IF EXISTS production_order_phase_history_direction_check;

ALTER TABLE public.production_order_phase_history
  ADD CONSTRAINT production_order_phase_history_direction_check
  CHECK (direction = ANY (ARRAY['forward'::text, 'regress'::text, 'initial'::text, 'deadline'::text]));

-- Update reprogram_op to also append a 'deadline' event in the phase history
CREATE OR REPLACE FUNCTION public.reprogram_op(_op_id uuid, _new_due_date timestamp with time zone, _reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _old timestamptz;
  _tenant_id uuid;
  _current_phase text;
BEGIN
  IF _reason IS NULL OR length(trim(_reason)) < 10 THEN
    RAISE EXCEPTION 'Reprogramação exige justificativa (mínimo 10 caracteres)' USING ERRCODE='P0001';
  END IF;
  SELECT planned_end_date, tenant_id, status INTO _old, _tenant_id, _current_phase
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

  -- Append a deadline event to the phase history timeline.
  -- entered_at = exited_at so it shows as an instantaneous event in the timeline.
  INSERT INTO public.production_order_phase_history
    (tenant_id, production_order_id, phase, entered_at, exited_at, moved_by, direction, reason)
  VALUES
    (_tenant_id, _op_id, COALESCE(_current_phase, 'deadline'), now(), now(), auth.uid(), 'deadline',
     jsonb_build_object('previous_due_date', _old, 'new_due_date', _new_due_date, 'reason', _reason)::text);

  RETURN jsonb_build_object('ok', true, 'previous', _old, 'new', _new_due_date);
END;
$function$;