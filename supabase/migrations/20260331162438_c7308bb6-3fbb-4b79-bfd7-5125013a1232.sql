UPDATE public.orders SET order_number = 1 WHERE id = '1f026b8c-57af-4688-804b-c87ce70bb162';
SELECT setval('orders_order_number_seq', 1, true);