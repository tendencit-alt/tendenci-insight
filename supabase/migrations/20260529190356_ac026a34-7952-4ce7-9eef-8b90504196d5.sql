
-- Phase 1: Instrumentation for fulfillment recursion diagnosis
CREATE TABLE IF NOT EXISTS public.debug_fulfillment_trace (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  trigger_name text,
  order_id uuid,
  previous_status text,
  attempted_status text,
  final_status text,
  caller text,
  trigger_depth int,
  notes jsonb
);
GRANT SELECT, INSERT ON public.debug_fulfillment_trace TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.debug_fulfillment_trace_id_seq TO authenticated, service_role;
ALTER TABLE public.debug_fulfillment_trace ENABLE ROW LEVEL SECURITY;
CREATE POLICY "debug trace open" ON public.debug_fulfillment_trace FOR ALL USING (true) WITH CHECK (true);

-- Replace evaluator with extensive logging
CREATE OR REPLACE FUNCTION public.fulfillment_evaluate_order_status(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant uuid;
  v_status text;
  v_td int; v_dd int; v_ti int; v_di int;
  v_target text;
  v_path text[] := ARRAY['aprovado','liberado_producao','em_producao','producao_concluida','liberado_faturamento','faturado'];
  v_idx_current int;
  v_step text;
  v_prev text;
  v_recv_count int;
  v_after_status text;
  v_rows int;
BEGIN
  IF _order_id IS NULL THEN RETURN; END IF;

  SELECT tenant_id, status INTO v_tenant, v_status
    FROM public.orders WHERE id=_order_id;
  IF v_tenant IS NULL THEN RETURN; END IF;

  INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,previous_status,attempted_status,caller,trigger_depth,notes)
  VALUES('evaluator:enter',_order_id,v_status,NULL,'fulfillment_evaluate_order_status',pg_trigger_depth(),
         jsonb_build_object('tenant',v_tenant));

  IF v_status IN ('entregue','encerrado','cancelado') THEN
    INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,previous_status,caller,notes)
    VALUES('evaluator:exit_terminal',_order_id,v_status,'fulfillment_evaluate_order_status',jsonb_build_object('reason','terminal'));
    RETURN;
  END IF;

  SELECT count(*)::int, count(*) FILTER (WHERE status='entregue')::int
    INTO v_td, v_dd
    FROM public.delivery_orders WHERE order_id=_order_id AND tenant_id=v_tenant;
  SELECT count(*)::int, count(*) FILTER (WHERE status='concluida')::int
    INTO v_ti, v_di
    FROM public.installation_orders WHERE order_id=_order_id AND tenant_id=v_tenant;

  IF (v_td + v_ti) = 0 THEN RETURN; END IF;

  IF (v_dd = v_td) AND (v_di = v_ti) THEN v_target := 'entregue';
  ELSIF v_dd>0 OR v_di>0 THEN v_target := 'entrega_parcial';
  ELSE RETURN;
  END IF;

  INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,previous_status,attempted_status,caller,trigger_depth,notes)
  VALUES('evaluator:counts',_order_id,v_status,v_target,'fulfillment_evaluate_order_status',pg_trigger_depth(),
         jsonb_build_object('td',v_td,'dd',v_dd,'ti',v_ti,'di',v_di));

  IF v_status='entrega_parcial' AND v_target='entrega_parcial' THEN RETURN; END IF;

  v_idx_current := array_position(v_path, v_status);
  IF v_idx_current IS NULL AND v_status <> 'entrega_parcial' THEN v_idx_current := 0; END IF;

  IF v_status <> 'entrega_parcial' THEN
    FOR i IN GREATEST(COALESCE(v_idx_current,0)+1,1) .. 6 LOOP
      v_step := v_path[i];
      SELECT status INTO v_prev FROM public.orders WHERE id=_order_id;
      IF v_prev = v_step THEN CONTINUE; END IF;
      IF v_prev IN ('entregue','encerrado','cancelado','entrega_parcial') THEN EXIT; END IF;

      IF v_step='faturado' THEN
        SELECT count(*) INTO v_recv_count FROM public.fin_receivables
         WHERE order_id=_order_id AND tenant_id=v_tenant
           AND COALESCE(status,'') NOT IN ('cancelado','cancelled');
      END IF;

      UPDATE public.orders SET status=v_step, updated_at=now()
       WHERE id=_order_id AND tenant_id=v_tenant
         AND status NOT IN ('entregue','encerrado','cancelado','entrega_parcial');
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      SELECT status INTO v_after_status FROM public.orders WHERE id=_order_id;

      INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,previous_status,attempted_status,final_status,caller,trigger_depth,notes)
      VALUES('evaluator:step_update',_order_id,v_prev,v_step,v_after_status,'fulfillment_evaluate_order_status',pg_trigger_depth(),
             jsonb_build_object('rows',v_rows));

      IF FOUND THEN
        INSERT INTO public.audit_log
          (tenant_id,table_name,record_id,event_type,event_source,field_name,old_value,new_value,metadata)
        VALUES(v_tenant,'orders',_order_id::text,'auto_promote','fulfillment_evaluate_order_status','status',v_prev,v_step,
               jsonb_build_object('origin','delivery_completion'));
      END IF;
    END LOOP;
  END IF;

  SELECT status INTO v_prev FROM public.orders WHERE id=_order_id;
  IF v_prev IN ('entregue','encerrado','cancelado') THEN RETURN; END IF;

  SELECT count(*) FILTER (WHERE status='entregue')::int INTO v_dd
    FROM public.delivery_orders WHERE order_id=_order_id AND tenant_id=v_tenant;
  SELECT count(*) FILTER (WHERE status='concluida')::int INTO v_di
    FROM public.installation_orders WHERE order_id=_order_id AND tenant_id=v_tenant;
  IF (v_dd = v_td) AND (v_di = v_ti) THEN v_target := 'entregue';
  ELSIF v_dd>0 OR v_di>0 THEN v_target := 'entrega_parcial';
  END IF;

  INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,previous_status,attempted_status,caller,trigger_depth,notes)
  VALUES('evaluator:final_decision',_order_id,v_prev,v_target,'fulfillment_evaluate_order_status',pg_trigger_depth(),
         jsonb_build_object('td',v_td,'dd',v_dd,'ti',v_ti,'di',v_di));

  IF v_target='entregue' THEN
    UPDATE public.orders
       SET status='entregue',
           data_entrega_realizada=COALESCE(data_entrega_realizada,CURRENT_DATE),
           updated_at=now()
     WHERE id=_order_id AND tenant_id=v_tenant
       AND status NOT IN ('entregue','encerrado','cancelado');
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    SELECT status INTO v_after_status FROM public.orders WHERE id=_order_id;
    INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,previous_status,attempted_status,final_status,caller,trigger_depth,notes)
    VALUES('evaluator:final_entregue',_order_id,v_prev,'entregue',v_after_status,'fulfillment_evaluate_order_status',pg_trigger_depth(),
           jsonb_build_object('rows',v_rows));
  ELSIF v_target='entrega_parcial' AND v_prev IN ('faturado','entrega_parcial') THEN
    UPDATE public.orders
       SET status='entrega_parcial', updated_at=now()
     WHERE id=_order_id AND tenant_id=v_tenant AND status IN ('faturado','entrega_parcial');
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    SELECT status INTO v_after_status FROM public.orders WHERE id=_order_id;
    INSERT INTO public.debug_fulfillment_trace(trigger_name,order_id,previous_status,attempted_status,final_status,caller,trigger_depth,notes)
    VALUES('evaluator:final_parcial',_order_id,v_prev,'entrega_parcial',v_after_status,'fulfillment_evaluate_order_status',pg_trigger_depth(),
           jsonb_build_object('rows',v_rows));
  END IF;
END;
$function$;
