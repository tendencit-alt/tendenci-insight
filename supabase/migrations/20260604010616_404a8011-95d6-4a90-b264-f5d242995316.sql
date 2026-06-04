-- 1. Update inicial para aplicar desconto em todas as OPs existentes
UPDATE public.production_orders po
SET value = oi.valor_total * (
    CASE 
      WHEN o.subtotal > 0 THEN (o.valor_total / o.subtotal)
      ELSE 1 
    END
),
updated_at = now()
FROM public.order_items oi
JOIN public.orders o ON oi.order_id = o.id
WHERE po.order_item_id = oi.id;

-- 2. Atualizar a função de sincronização para considerar o desconto do pedido
CREATE OR REPLACE FUNCTION public.sync_op_value_with_item()
RETURNS trigger AS $$
DECLARE
  v_fator_desconto numeric;
BEGIN
  IF NEW.order_item_id IS NOT NULL THEN
    -- Busca o fator de desconto do pedido pai (valor_total / subtotal)
    SELECT 
      CASE WHEN subtotal > 0 THEN (valor_total / subtotal) ELSE 1 END
    INTO v_fator_desconto
    FROM public.orders 
    WHERE id = (SELECT order_id FROM public.order_items WHERE id = NEW.order_item_id);

    -- Aplica o fator no valor_total do item
    SELECT (valor_total * COALESCE(v_fator_desconto, 1)) INTO NEW.value
    FROM public.order_items
    WHERE id = NEW.order_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;