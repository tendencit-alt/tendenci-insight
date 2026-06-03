GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_status_checklist_items TO authenticated;
GRANT ALL ON public.production_status_checklist_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_order_checklist_progress TO authenticated;
GRANT ALL ON public.production_order_checklist_progress TO service_role;