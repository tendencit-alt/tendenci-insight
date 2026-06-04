CREATE TABLE public.audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID,
    user_id UUID REFERENCES auth.users(id),
    table_name TEXT,
    record_id TEXT,
    event_type TEXT,
    event_source TEXT,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for their tenant" ON public.audit_log
    FOR SELECT USING (
        tenant_id = (SELECT current_tenant_id FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert audit logs" ON public.audit_log
    FOR INSERT WITH CHECK (true);

-- Recreate the reprogram_op function to ensure it uses the newly created audit_log table
CREATE OR REPLACE FUNCTION public.reprogram_op(_op_id uuid, _new_due_date timestamptz, _reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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

  INSERT INTO public.production_order_phase_history
    (tenant_id, production_order_id, phase, entered_at, exited_at, moved_by, direction, reason)
  VALUES
    (_tenant_id, _op_id, COALESCE(_current_phase, 'deadline'), now(), now(), auth.uid(), 'deadline',
     jsonb_build_object('previous_due_date', _old, 'new_due_date', _new_due_date, 'reason', _reason)::text);

  RETURN jsonb_build_object('ok', true, 'previous', _old, 'new', _new_due_date);
END;
$function$;