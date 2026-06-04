-- Update inicial para OPs existentes
UPDATE public.production_orders po
SET value = oi.valor_total,
    updated_at = now()
FROM public.order_items oi
WHERE po.order_item_id = oi.id
  AND (po.value IS NULL OR po.value = 0);

-- Função para sincronizar valor da OP com o item
CREATE OR REPLACE FUNCTION public.sync_op_value_with_item()
RETURNS trigger AS $$
BEGIN
  IF NEW.order_item_id IS NOT NULL THEN
    SELECT valor_total INTO NEW.value
    FROM public.order_items
    WHERE id = NEW.order_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para garantir que novas OPs ou mudanças de item reflitam o valor correto
DROP TRIGGER IF EXISTS trigger_sync_op_value ON public.production_orders;
CREATE TRIGGER trigger_sync_op_value
BEFORE INSERT OR UPDATE OF order_item_id ON public.production_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_op_value_with_item();