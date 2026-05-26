
CREATE OR REPLACE FUNCTION public.auto_reserve_stock_for_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_item record;
BEGIN
  IF NEW.status NOT IN ('ativo','aprovado','approved') THEN
    RETURN NEW;
  END IF;
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_item IN
    SELECT oi.id, oi.produto_id, oi.quantidade, p.location_id
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.produto_id
    WHERE oi.order_id = NEW.id
      AND oi.produto_id IS NOT NULL
      AND p.location_id IS NOT NULL
  LOOP
    -- project_id em inv_stock_reservations referencia prj_projects (operacional),
    -- enquanto orders.project_id referencia fin_projects (financeiro).
    -- Por isso não copiamos NEW.project_id aqui (FK divergente).
    INSERT INTO public.inv_stock_reservations (
      tenant_id, product_id, project_id, quantity, status, source_order_item_id, notes
    ) VALUES (
      NEW.tenant_id,
      v_item.produto_id,
      NULL,
      v_item.quantidade,
      'active',
      v_item.id,
      'Reserva automática — Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text)
    )
    ON CONFLICT (source_order_item_id) WHERE source_order_item_id IS NOT NULL DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$function$;
