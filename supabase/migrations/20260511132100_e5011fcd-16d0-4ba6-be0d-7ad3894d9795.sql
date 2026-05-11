
ALTER TABLE public.fin_projects
  DROP CONSTRAINT fin_projects_order_id_fkey,
  ADD CONSTRAINT fin_projects_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;
