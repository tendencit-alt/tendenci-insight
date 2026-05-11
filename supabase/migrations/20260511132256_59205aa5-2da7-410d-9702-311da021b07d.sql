
CREATE OR REPLACE FUNCTION public.on_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_op_id uuid;
BEGIN
  IF NEW.status = 'aprovado' AND OLD.status != 'aprovado' THEN
    PERFORM register_cross_module_event(
      'pedido_aprovado', 'comercial', 'financeiro',
      'orders', NEW.id, NULL, NULL,
      jsonb_build_object(
        'order_number', NEW.order_number,
        'total_value', NEW.valor_total,
        'gerar_provisoes', true,
        'gerar_contas_receber_previstas', true,
        'gerar_custos_variaveis_previstos', true
      )
    );

    INSERT INTO public.operational_projects (
      tenant_id, name, client_id, order_id, responsible_id, status, created_by
    ) VALUES (
      NEW.tenant_id,
      'Projeto - Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text),
      NEW.client_id,
      NEW.id,
      NEW.vendedor_id,
      'aguardando_liberacao',
      auth.uid()
    ) RETURNING id INTO v_op_id;

    UPDATE public.orders SET operational_project_id = v_op_id WHERE id = NEW.id;
  END IF;

  IF NEW.status = 'liberado_producao' AND OLD.status != 'liberado_producao' THEN
    UPDATE public.operational_projects
    SET status = 'em_producao', updated_at = now()
    WHERE order_id = NEW.id AND status = 'aguardando_liberacao';

    PERFORM register_cross_module_event(
      'pedido_liberado_producao', 'comercial', 'operacional',
      'orders', NEW.id, NULL, NULL,
      jsonb_build_object('order_number', NEW.order_number)
    );
  END IF;

  IF NEW.status = 'em_producao' AND OLD.status NOT IN ('em_producao', 'liberado_producao') THEN
    UPDATE public.operational_projects
    SET status = 'em_producao', updated_at = now()
    WHERE order_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;
