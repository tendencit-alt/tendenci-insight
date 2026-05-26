
SET session_replication_role = 'replica';

DELETE FROM public.fin_receivables
WHERE order_id IN ('1ab1d27b-f54b-47e7-bd50-3d9e65a080d3','65dc7d0f-64a8-489f-98f9-fd855e729b0f')
   OR ledger_entry_id IN (
     '015d2634-0865-42ff-a28b-7fca4a04495d',
     'c92a9502-6457-4368-a761-420d5584d1ec',
     '710ec9a8-cd03-41e4-a730-97bc91979c03'
   );

DELETE FROM public.fin_payables
WHERE order_id IN ('1ab1d27b-f54b-47e7-bd50-3d9e65a080d3','65dc7d0f-64a8-489f-98f9-fd855e729b0f');

DELETE FROM public.fin_ledger_entries
WHERE id IN (
  '015d2634-0865-42ff-a28b-7fca4a04495d',
  'c92a9502-6457-4368-a761-420d5584d1ec',
  '710ec9a8-cd03-41e4-a730-97bc91979c03'
) OR order_id IN ('1ab1d27b-f54b-47e7-bd50-3d9e65a080d3','65dc7d0f-64a8-489f-98f9-fd855e729b0f');

DELETE FROM public.production_orders
WHERE order_id IN ('1ab1d27b-f54b-47e7-bd50-3d9e65a080d3','65dc7d0f-64a8-489f-98f9-fd855e729b0f');

DELETE FROM public.order_items
WHERE order_id IN ('1ab1d27b-f54b-47e7-bd50-3d9e65a080d3','65dc7d0f-64a8-489f-98f9-fd855e729b0f');

DELETE FROM public.order_history
WHERE order_id IN ('1ab1d27b-f54b-47e7-bd50-3d9e65a080d3','65dc7d0f-64a8-489f-98f9-fd855e729b0f');

DELETE FROM public.orders
WHERE id IN ('1ab1d27b-f54b-47e7-bd50-3d9e65a080d3','65dc7d0f-64a8-489f-98f9-fd855e729b0f');

SET session_replication_role = 'origin';
