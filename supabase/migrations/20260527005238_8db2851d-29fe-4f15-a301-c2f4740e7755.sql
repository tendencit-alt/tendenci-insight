-- Garante exclusão do projeto vinculado quando o pedido é excluído.
-- Cobre qualquer caminho (RPC delete_order_cascade, DELETE direto via SDK, SQL manual).
-- Idempotente, tenant-safe, sem mexer em RLS.

CREATE OR REPLACE FUNCTION public.cascade_delete_order_projects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Remove projetos operacionais vinculados (FK já é CASCADE, mas garantimos no mesmo tenant)
  DELETE FROM public.operational_projects
  WHERE order_id = OLD.id
    AND tenant_id IS NOT DISTINCT FROM OLD.tenant_id;

  -- Remove projeto financeiro vinculado ao pedido (FK atual é SET NULL).
  DELETE FROM public.fin_projects
  WHERE order_id = OLD.id
    AND tenant_id IS NOT DISTINCT FROM OLD.tenant_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_delete_order_projects ON public.orders;
CREATE TRIGGER trg_cascade_delete_order_projects
AFTER DELETE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.cascade_delete_order_projects();