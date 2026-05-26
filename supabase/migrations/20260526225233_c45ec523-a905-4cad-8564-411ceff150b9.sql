
-- ============================================================
-- 1) products.reserved_stock SINC com inv_stock_reservations
-- ============================================================
-- A coluna products.reserved_stock é usada por:
--   * v_mrp_suggestions (available = current - reserved)
--   * ProductDetailSheet, PurchaseSuggestions, InvAnalyticsTab
-- Hoje nenhum trigger mantém esse campo em sincronia com
-- inv_stock_reservations. Vamos sincronizar por delta.
-- Convenção: "ativa" == status = 'active'. Liberada/cancelada/
-- consumida deixam de reservar (qty efetiva = 0).

CREATE OR REPLACE FUNCTION public.sync_product_reserved_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_eff numeric := 0;
  v_new_eff numeric := 0;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    IF OLD.status = 'active' THEN
      v_old_eff := COALESCE(OLD.quantity, 0);
    END IF;
  END IF;

  IF TG_OP IN ('INSERT','UPDATE') THEN
    IF NEW.status = 'active' THEN
      v_new_eff := COALESCE(NEW.quantity, 0);
    END IF;
  END IF;

  -- mesma reserva, mesmo produto: aplica delta
  IF TG_OP = 'UPDATE' AND NEW.product_id = OLD.product_id THEN
    IF v_new_eff <> v_old_eff THEN
      UPDATE public.products
         SET reserved_stock = GREATEST(0, COALESCE(reserved_stock,0) + (v_new_eff - v_old_eff))
       WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
  END IF;

  -- INSERT
  IF TG_OP = 'INSERT' THEN
    IF v_new_eff > 0 THEN
      UPDATE public.products
         SET reserved_stock = COALESCE(reserved_stock,0) + v_new_eff
       WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
  END IF;

  -- DELETE
  IF TG_OP = 'DELETE' THEN
    IF v_old_eff > 0 THEN
      UPDATE public.products
         SET reserved_stock = GREATEST(0, COALESCE(reserved_stock,0) - v_old_eff)
       WHERE id = OLD.product_id;
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE com troca de product_id: zera no antigo, soma no novo
  IF v_old_eff > 0 THEN
    UPDATE public.products
       SET reserved_stock = GREATEST(0, COALESCE(reserved_stock,0) - v_old_eff)
     WHERE id = OLD.product_id;
  END IF;
  IF v_new_eff > 0 THEN
    UPDATE public.products
       SET reserved_stock = COALESCE(reserved_stock,0) + v_new_eff
     WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_reserved_stock_ins ON public.inv_stock_reservations;
DROP TRIGGER IF EXISTS trg_sync_product_reserved_stock_upd ON public.inv_stock_reservations;
DROP TRIGGER IF EXISTS trg_sync_product_reserved_stock_del ON public.inv_stock_reservations;

CREATE TRIGGER trg_sync_product_reserved_stock_ins
AFTER INSERT ON public.inv_stock_reservations
FOR EACH ROW EXECUTE FUNCTION public.sync_product_reserved_stock();

CREATE TRIGGER trg_sync_product_reserved_stock_upd
AFTER UPDATE ON public.inv_stock_reservations
FOR EACH ROW EXECUTE FUNCTION public.sync_product_reserved_stock();

CREATE TRIGGER trg_sync_product_reserved_stock_del
AFTER DELETE ON public.inv_stock_reservations
FOR EACH ROW EXECUTE FUNCTION public.sync_product_reserved_stock();

-- Backfill idempotente: recalcula reserved_stock a partir das reservas ativas
UPDATE public.products p
   SET reserved_stock = COALESCE(s.q, 0)
  FROM (
    SELECT product_id, SUM(quantity) AS q
      FROM public.inv_stock_reservations
     WHERE status = 'active'
     GROUP BY product_id
  ) s
 WHERE p.id = s.product_id
   AND COALESCE(p.reserved_stock,0) IS DISTINCT FROM COALESCE(s.q,0);

UPDATE public.products
   SET reserved_stock = 0
 WHERE COALESCE(reserved_stock,0) <> 0
   AND id NOT IN (SELECT product_id FROM public.inv_stock_reservations WHERE status='active');

-- ============================================================
-- 2) orders.requer_montagem + ajuste do trigger de fulfillment
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS requer_montagem boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.auto_create_fulfillment_on_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_endereco text;
  v_delivery_id uuid;
BEGIN
  IF NEW.status <> 'faturado' THEN RETURN NEW; END IF;
  IF OLD.status = 'faturado' THEN RETURN NEW; END IF;
  IF NEW.tenant_id IS NULL THEN RETURN NEW; END IF;

  v_endereco := NULLIF(trim(concat_ws(', ',
    NEW.entrega_logradouro,
    NEW.entrega_numero,
    NEW.entrega_bairro,
    NEW.entrega_cidade,
    NEW.entrega_uf
  )), '');

  -- Sempre cria delivery_order (idempotente)
  IF NOT EXISTS (SELECT 1 FROM public.delivery_orders WHERE order_id = NEW.id) THEN
    INSERT INTO public.delivery_orders (
      tenant_id, order_id, status, endereco, created_by
    ) VALUES (
      NEW.tenant_id, NEW.id, 'pendente', v_endereco, NEW.created_by
    ) RETURNING id INTO v_delivery_id;
  ELSE
    SELECT id INTO v_delivery_id FROM public.delivery_orders WHERE order_id = NEW.id LIMIT 1;
  END IF;

  -- Installation: somente se requer_montagem = true (idempotente)
  IF COALESCE(NEW.requer_montagem, true) = true
     AND NOT EXISTS (SELECT 1 FROM public.installation_orders WHERE order_id = NEW.id) THEN
    INSERT INTO public.installation_orders (
      tenant_id, order_id, delivery_order_id, status, endereco, created_by
    ) VALUES (
      NEW.tenant_id, NEW.id, v_delivery_id, 'pendente', v_endereco, NEW.created_by
    );
  END IF;

  RETURN NEW;
END;
$$;
