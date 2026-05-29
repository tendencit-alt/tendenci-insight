
-- ============ PHASE 4: REMOVE INSTRUMENTATION ============
-- Restore evaluator without debug logging (keep functional improvements)
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
BEGIN
  IF _order_id IS NULL THEN RETURN; END IF;
  SELECT tenant_id, status INTO v_tenant, v_status FROM public.orders WHERE id=_order_id;
  IF v_tenant IS NULL THEN RETURN; END IF;
  IF v_status IN ('entregue','encerrado','cancelado') THEN RETURN; END IF;

  SELECT count(*)::int, count(*) FILTER (WHERE status='entregue')::int INTO v_td, v_dd
    FROM public.delivery_orders WHERE order_id=_order_id AND tenant_id=v_tenant;
  SELECT count(*)::int, count(*) FILTER (WHERE status='concluida')::int INTO v_ti, v_di
    FROM public.installation_orders WHERE order_id=_order_id AND tenant_id=v_tenant;
  IF (v_td + v_ti) = 0 THEN RETURN; END IF;

  IF (v_dd = v_td) AND (v_di = v_ti) THEN v_target := 'entregue';
  ELSIF v_dd>0 OR v_di>0 THEN v_target := 'entrega_parcial';
  ELSE RETURN;
  END IF;
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
        IF v_recv_count>0 THEN
          INSERT INTO public.cross_module_events
            (tenant_id,event_type,source_module,target_module,source_entity,source_entity_id,target_entity,target_entity_id,payload,status)
          VALUES(v_tenant,'receivable_skipped_already_exists','fulfillment','financeiro_ar','orders',_order_id,'fin_receivables',_order_id,
                 jsonb_build_object('order_id',_order_id,'existing_count',v_recv_count),'processed');
        END IF;
      END IF;

      UPDATE public.orders SET status=v_step, updated_at=now()
       WHERE id=_order_id AND tenant_id=v_tenant
         AND status NOT IN ('entregue','encerrado','cancelado','entrega_parcial');

      IF FOUND THEN
        INSERT INTO public.audit_log
          (tenant_id,table_name,record_id,event_type,event_source,field_name,old_value,new_value,metadata)
        VALUES(v_tenant,'orders',_order_id::text,'auto_promote','fulfillment_evaluate_order_status','status',v_prev,v_step,
               jsonb_build_object('origin','delivery_completion','order_id',_order_id,'previous_status',v_prev,'new_status',v_step));
        INSERT INTO public.cross_module_events
          (tenant_id,event_type,source_module,target_module,source_entity,source_entity_id,target_entity,target_entity_id,payload,status)
        VALUES(v_tenant,'order_auto_promoted','fulfillment','orders','orders',_order_id,'orders',_order_id,
               jsonb_build_object('previous_status',v_prev,'new_status',v_step,'origin','delivery_completion'),'processed');
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

  IF v_target='entregue' THEN
    UPDATE public.orders
       SET status='entregue', data_entrega_realizada=COALESCE(data_entrega_realizada,CURRENT_DATE), updated_at=now()
     WHERE id=_order_id AND tenant_id=v_tenant AND status NOT IN ('entregue','encerrado','cancelado');
  ELSIF v_target='entrega_parcial' AND v_prev IN ('faturado','entrega_parcial') THEN
    UPDATE public.orders SET status='entrega_parcial', updated_at=now()
     WHERE id=_order_id AND tenant_id=v_tenant AND status IN ('faturado','entrega_parcial');
  ELSE
    RETURN;
  END IF;

  IF FOUND THEN
    INSERT INTO public.audit_log
      (tenant_id,table_name,record_id,event_type,event_source,field_name,old_value,new_value,metadata)
    VALUES(v_tenant,'orders',_order_id::text,'auto_promote','fulfillment_evaluate_order_status','status',v_prev,v_target,
           jsonb_build_object('origin','delivery_completion','order_id',_order_id,'previous_status',v_prev,'new_status',v_target,
                              'total_deliveries',v_td,'done_deliveries',v_dd,'total_installations',v_ti,'done_installations',v_di));
    INSERT INTO public.cross_module_events
      (tenant_id,event_type,source_module,target_module,source_entity,source_entity_id,target_entity,target_entity_id,payload,status)
    VALUES(v_tenant, CASE WHEN v_target='entregue' THEN 'order_auto_delivered' ELSE 'order_partial_delivered' END,
           'fulfillment','orders','orders',_order_id,'orders',_order_id,
           jsonb_build_object('previous_status',v_prev,'new_status',v_target,'total_deliveries',v_td,'done_deliveries',v_dd),'processed');
  END IF;
END;
$function$;

-- Drop instrumentation table
DROP TABLE IF EXISTS public.debug_fulfillment_trace;

-- ============ PHASE 5: CLEANUP SANDBOX ============
DO $$
DECLARE
  v_tenant uuid := '6f2fa786-e0a6-444e-8637-dbf55c4941dd';
BEGIN
  SET LOCAL session_replication_role = 'replica';
  DELETE FROM public.fin_receivables       WHERE tenant_id = v_tenant;
  DELETE FROM public.fin_payables          WHERE tenant_id = v_tenant;
  DELETE FROM public.fin_projects          WHERE tenant_id = v_tenant;
  DELETE FROM public.stock_movements       WHERE tenant_id = v_tenant;
  DELETE FROM public.cross_module_events   WHERE tenant_id = v_tenant;
  DELETE FROM public.erp_notifications     WHERE tenant_id = v_tenant;
  DELETE FROM public.audit_log             WHERE tenant_id = v_tenant;
  DELETE FROM public.installation_orders   WHERE tenant_id = v_tenant;
  DELETE FROM public.delivery_orders       WHERE tenant_id = v_tenant;
  DELETE FROM public.production_orders     WHERE tenant_id = v_tenant;
  DELETE FROM public.order_items           WHERE order_id IN (SELECT id FROM public.orders WHERE tenant_id = v_tenant);
  DELETE FROM public.orders                WHERE tenant_id = v_tenant;
  DELETE FROM public.tenants               WHERE id = v_tenant;
  SET LOCAL session_replication_role = 'origin';
END $$;
