DO $$
DECLARE r record;
BEGIN
  RAISE NOTICE '--- Orders Planejados/Mobiliarios ---';
  FOR r IN SELECT id, order_number, tenant_id FROM public.orders WHERE tenant_id IN ('11912d24-f3f2-41cb-8b35-d094352d5995','423ab4ec-9741-464b-948f-9edf6297e783') ORDER BY order_number LOOP
    RAISE NOTICE 'order_id=% n=% tenant=%', r.id, r.order_number, r.tenant_id;
  END LOOP;
  RAISE NOTICE '--- Match por id prefix c86309e3 ---';
  FOR r IN SELECT id, order_number, tenant_id FROM public.orders WHERE id::text LIKE 'c86309e3%' LOOP
    RAISE NOTICE 'order_id=% n=% tenant=%', r.id, r.order_number, r.tenant_id;
  END LOOP;
END $$;