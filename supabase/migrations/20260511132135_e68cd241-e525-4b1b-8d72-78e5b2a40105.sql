
CREATE OR REPLACE FUNCTION public.trg_integration_orders_to_financeiro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.record_integration_event('crm','financeiro','green','order_to_financial_synced',
    'Pedido ' || COALESCE(NEW.order_number::text, NEW.id::text) || ' sincronizado', NEW.tenant_id,
    jsonb_build_object('order_id', NEW.id));
  PERFORM public.record_integration_event('crm','projetos','green','order_to_project_created',
    'Pedido gerou projeto', NEW.tenant_id, jsonb_build_object('order_id', NEW.id));
  RETURN NEW;
END; $function$;
