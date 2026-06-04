DROP TRIGGER IF EXISTS trigger_sync_project_status ON public.production_orders;
DROP FUNCTION IF EXISTS public.sync_project_status_with_ops();