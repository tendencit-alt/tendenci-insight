
-- Admin bypass for order structural edit lock
CREATE OR REPLACE FUNCTION public.block_order_structural_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Admins/Owners have full edit access regardless of status
  IF public.is_tenant_admin(OLD.tenant_id) THEN
    RETURN NEW;
  END IF;

  IF OLD.status IN ('em_producao', 'producao_concluida', 'liberado_faturamento', 'faturado', 'entregue', 'encerrado') THEN
    IF (
      OLD.valor_total IS DISTINCT FROM NEW.valor_total OR
      OLD.client_id IS DISTINCT FROM NEW.client_id OR
      OLD.forma_pagamento IS DISTINCT FROM NEW.forma_pagamento OR
      OLD.forma_pagamento_2 IS DISTINCT FROM NEW.forma_pagamento_2 OR
      OLD.desconto_valor IS DISTINCT FROM NEW.desconto_valor OR
      OLD.desconto_percentual IS DISTINCT FROM NEW.desconto_percentual
    ) THEN
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'Não é possível alterar valores estruturais do pedido após início da produção (status: %)', OLD.status;
    END IF;
  END IF;

  IF OLD.status = 'encerrado' AND OLD.status = NEW.status THEN
    RAISE EXCEPTION 'Pedido encerrado não permite alterações';
  END IF;

  RETURN NEW;
END;
$function$;

-- Admin bypass for status transition validation
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_valid_transitions jsonb;
  v_allowed text[];
  v_is_admin boolean;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_is_admin := public.is_tenant_admin(OLD.tenant_id);

  v_valid_transitions := jsonb_build_object(
    'rascunho', '["em_negociacao", "aprovado", "cancelado"]',
    'em_negociacao', '["aprovado", "rascunho", "cancelado"]',
    'aprovado', '["liberado_producao", "em_producao", "cancelado"]',
    'liberado_producao', '["em_producao", "cancelado"]',
    'em_producao', '["producao_concluida"]',
    'producao_concluida', '["liberado_faturamento", "faturado"]',
    'liberado_faturamento', '["faturado"]',
    'faturado', '["entregue"]',
    'entregue', '["encerrado"]',
    'encerrado', '[]',
    'cancelado', '["rascunho"]'
  );

  SELECT array_agg(val::text) INTO v_allowed
  FROM jsonb_array_elements_text(
    (v_valid_transitions ->> OLD.status)::jsonb
  ) AS val;

  -- Non-admins must respect transition map and post-billing cancel lock
  IF NOT v_is_admin THEN
    IF v_allowed IS NULL OR NOT (NEW.status = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'Transição de status inválida: % → %. Transições permitidas: %',
        OLD.status, NEW.status, COALESCE(array_to_string(v_allowed, ', '), 'nenhuma');
    END IF;

    IF NEW.status = 'cancelado' AND OLD.status IN ('faturado', 'entregue', 'encerrado') THEN
      RAISE EXCEPTION 'Não é possível cancelar pedido após faturamento. Realize a reversão financeira primeiro.';
    END IF;
  END IF;

  CASE NEW.status
    WHEN 'aprovado' THEN
      NEW.data_aprovacao := COALESCE(NEW.data_aprovacao, now());
      NEW.approved_by := COALESCE(NEW.approved_by, auth.uid());
    WHEN 'faturado' THEN
      NEW.data_faturamento := COALESCE(NEW.data_faturamento, now());
    WHEN 'cancelado' THEN
      NEW.data_cancelamento := now();
    ELSE
      -- noop
  END CASE;

  RETURN NEW;
END;
$function$;
