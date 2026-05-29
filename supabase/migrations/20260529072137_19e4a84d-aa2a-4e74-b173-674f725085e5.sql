CREATE OR REPLACE FUNCTION public.sync_product_reserved_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_eff numeric := 0;
  v_new_eff numeric := 0;
  v_active_statuses text[] := ARRAY['active','reservado','reserved','pendente','pending','parcial'];
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    IF OLD.status = ANY(v_active_statuses) THEN
      v_old_eff := GREATEST(0, COALESCE(OLD.quantity,0) - COALESCE(OLD.consumed_quantity,0));
    END IF;
  END IF;

  IF TG_OP IN ('INSERT','UPDATE') THEN
    IF NEW.status = ANY(v_active_statuses) THEN
      v_new_eff := GREATEST(0, COALESCE(NEW.quantity,0) - COALESCE(NEW.consumed_quantity,0));
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.product_id = OLD.product_id THEN
    IF v_new_eff <> v_old_eff THEN
      UPDATE public.products
         SET reserved_stock = GREATEST(0, COALESCE(reserved_stock,0) + (v_new_eff - v_old_eff))
       WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF v_new_eff > 0 THEN
      UPDATE public.products
         SET reserved_stock = COALESCE(reserved_stock,0) + v_new_eff
       WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF v_old_eff > 0 THEN
      UPDATE public.products
         SET reserved_stock = GREATEST(0, COALESCE(reserved_stock,0) - v_old_eff)
       WHERE id = OLD.product_id;
    END IF;
    RETURN OLD;
  END IF;

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
$function$;

-- Recalc all
UPDATE public.products p
SET reserved_stock = COALESCE(s.r, 0)
FROM (
  SELECT product_id, SUM(GREATEST(0, COALESCE(quantity,0) - COALESCE(consumed_quantity,0))) AS r
  FROM public.inv_stock_reservations
  WHERE status IN ('active','reservado','reserved','pendente','pending','parcial')
  GROUP BY product_id
) s
WHERE p.id = s.product_id;