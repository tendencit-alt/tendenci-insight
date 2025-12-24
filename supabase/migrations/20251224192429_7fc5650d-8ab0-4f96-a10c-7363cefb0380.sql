-- Criar production_products para todas as OPs existentes que ainda não têm ficha técnica
INSERT INTO public.production_products (production_order_id, name)
SELECT 
  po.id AS production_order_id,
  COALESCE(po.title, 'Produto OP #' || po.order_number) AS name
FROM public.production_orders po
LEFT JOIN public.production_products pp ON pp.production_order_id = po.id
WHERE pp.id IS NULL;