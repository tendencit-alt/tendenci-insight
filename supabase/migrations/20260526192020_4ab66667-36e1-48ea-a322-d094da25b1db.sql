
ALTER TABLE public.operational_projects
  DROP CONSTRAINT IF EXISTS operational_projects_order_id_fkey;

ALTER TABLE public.operational_projects
  ADD CONSTRAINT operational_projects_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;
