
CREATE OR REPLACE FUNCTION public.block_order_structural_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
