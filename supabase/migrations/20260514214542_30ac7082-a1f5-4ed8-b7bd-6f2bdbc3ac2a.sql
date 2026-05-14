CREATE OR REPLACE FUNCTION public.sync_order_item_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_stock NUMERIC;
  v_tenant UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.produto_id IS NOT NULL AND OLD.quantidade IS NOT NULL AND OLD.quantidade > 0 THEN
      SELECT tenant_id INTO v_tenant FROM orders WHERE id = OLD.order_id;
      SELECT COALESCE(current_stock, 0) INTO v_prev_stock FROM products WHERE id = OLD.produto_id;
      INSERT INTO stock_movements (
        tenant_id, product_id, movement_type, quantity,
        previous_stock, reference_type, reference_id, notes
      ) VALUES (
        v_tenant, OLD.produto_id, 'entrada', OLD.quantidade,
        COALESCE(v_prev_stock, 0), 'order_item_revert', OLD.id,
        'Estorno automático (item de pedido removido)'
      );
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.produto_id IS NOT NULL
       AND OLD.quantidade IS NOT NULL
       AND OLD.quantidade > 0
       AND (OLD.quantidade IS DISTINCT FROM NEW.quantidade OR OLD.produto_id IS DISTINCT FROM NEW.produto_id)
    THEN
      SELECT tenant_id INTO v_tenant FROM orders WHERE id = OLD.order_id;
      SELECT COALESCE(current_stock, 0) INTO v_prev_stock FROM products WHERE id = OLD.produto_id;
      INSERT INTO stock_movements (
        tenant_id, product_id, movement_type, quantity,
        previous_stock, reference_type, reference_id, notes
      ) VALUES (
        v_tenant, OLD.produto_id, 'entrada', OLD.quantidade,
        COALESCE(v_prev_stock, 0), 'order_item_revert', OLD.id,
        'Estorno automático (item de pedido alterado)'
      );
    ELSIF OLD.produto_id IS NOT DISTINCT FROM NEW.produto_id
          AND OLD.quantidade IS NOT DISTINCT FROM NEW.quantidade THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.produto_id IS NOT NULL AND NEW.quantidade IS NOT NULL AND NEW.quantidade > 0 THEN
    IF TG_OP = 'INSERT' AND EXISTS (
      SELECT 1 FROM stock_movements
      WHERE reference_type = 'order_item' AND reference_id = NEW.id
    ) THEN
      RETURN NEW;
    END IF;

    SELECT tenant_id INTO v_tenant FROM orders WHERE id = NEW.order_id;
    SELECT COALESCE(current_stock, 0) INTO v_prev_stock FROM products WHERE id = NEW.produto_id;
    INSERT INTO stock_movements (
      tenant_id, product_id, movement_type, quantity,
      previous_stock, reference_type, reference_id, notes
    ) VALUES (
      v_tenant, NEW.produto_id, 'saida', NEW.quantidade,
      COALESCE(v_prev_stock, 0), 'order_item', NEW.id,
      'Baixa automática de venda'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_item_stock ON public.order_items;
CREATE TRIGGER trg_order_item_stock
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.sync_order_item_stock_movement();

-- Reconciliação retroativa
INSERT INTO public.stock_movements (
  tenant_id, product_id, movement_type, quantity,
  previous_stock, reference_type, reference_id, notes, created_at
)
SELECT
  o.tenant_id,
  oi.produto_id,
  'saida',
  oi.quantidade,
  0,
  'order_item',
  oi.id,
  'Baixa retroativa de venda (reconciliação)',
  COALESCE(oi.created_at, now())
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
WHERE oi.produto_id IS NOT NULL
  AND oi.quantidade IS NOT NULL
  AND oi.quantidade > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.stock_movements sm
    WHERE sm.reference_type = 'order_item' AND sm.reference_id = oi.id
  );

-- Recalcula current_stock
UPDATE public.products p
SET current_stock = COALESCE(agg.total, 0),
    updated_at = now()
FROM (
  SELECT
    product_id,
    SUM(
      CASE
        WHEN movement_type IN ('entrada','producao_saida','ajuste_positivo') THEN quantity
        WHEN movement_type IN ('saida','producao_consumo','ajuste_negativo') THEN -quantity
        ELSE 0
      END
    ) AS total
  FROM public.stock_movements
  GROUP BY product_id
) agg
WHERE p.id = agg.product_id;