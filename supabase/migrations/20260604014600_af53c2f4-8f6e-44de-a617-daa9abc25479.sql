DO $$
DECLARE
  r RECORD;
BEGIN
  -- Permite a alteração do prazo na sessão atual
  PERFORM set_config('app.allow_due_date_change', 'true', true);

  FOR r IN 
    SELECT po.id, o.data_entrega_prevista
    FROM public.production_orders po
    JOIN public.orders o ON po.order_id = o.id
    WHERE o.data_entrega_prevista IS NOT NULL
      AND (po.planned_end_date IS NULL OR po.planned_end_date::date <> o.data_entrega_prevista)
  LOOP
    UPDATE public.production_orders
    SET planned_end_date = r.data_entrega_prevista::timestamp with time zone,
        updated_at = now()
    WHERE id = r.id;
  END LOOP;

  -- Para OPs vinculadas via order_items
  FOR r IN 
    SELECT po.id, o.data_entrega_prevista
    FROM public.production_orders po
    JOIN public.order_items oi ON po.order_item_id = oi.id
    JOIN public.orders o ON oi.order_id = o.id
    WHERE o.data_entrega_prevista IS NOT NULL
      AND (po.planned_end_date IS NULL OR po.planned_end_date::date <> o.data_entrega_prevista)
  LOOP
    UPDATE public.production_orders
    SET planned_end_date = r.data_entrega_prevista::timestamp with time zone,
        updated_at = now()
    WHERE id = r.id;
  END LOOP;

  -- Restaura a trava (opcional na sessão, mas boa prática)
  PERFORM set_config('app.allow_due_date_change', 'false', true);
END $$;
