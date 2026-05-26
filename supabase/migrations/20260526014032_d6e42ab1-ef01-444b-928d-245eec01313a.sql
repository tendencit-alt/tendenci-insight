
CREATE OR REPLACE FUNCTION public.delete_order_cascade(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid;
BEGIN
  SELECT tenant_id INTO _tenant FROM orders WHERE id = _order_id;
  IF _tenant IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  -- Authorization: caller must belong to the tenant (or be owner)
  IF NOT (public.is_owner() OR EXISTS (
    SELECT 1 FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid() AND ut.tenant_id = _tenant
  )) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Financial records generated from the order
  DELETE FROM fin_ledger_entries WHERE order_id = _order_id;
  DELETE FROM fin_receivables WHERE order_id = _order_id;
  DELETE FROM fin_payables WHERE order_id = _order_id;
  DELETE FROM fin_financial_goals WHERE order_id = _order_id;
  DELETE FROM fin_budgets WHERE order_id = _order_id;
  DELETE FROM fin_forecasts WHERE order_id = _order_id;

  -- Production: ops_orders sourced from this order (cascade handles children)
  DELETE FROM ops_orders WHERE source_order_id = _order_id;

  -- Production orders linked directly (and their cascading children)
  DELETE FROM production_orders WHERE order_id = _order_id;

  -- Production groups
  DELETE FROM production_order_groups WHERE order_id = _order_id;

  -- Projects derived from order
  DELETE FROM operational_projects WHERE order_id = _order_id;
  DELETE FROM fin_projects WHERE order_id = _order_id;

  -- Commercial linked artifacts (only those generated from order)
  DELETE FROM quotes WHERE order_id = _order_id;
  DELETE FROM contracts WHERE order_id = _order_id;

  -- Order children
  DELETE FROM order_history WHERE order_id = _order_id;
  DELETE FROM order_items WHERE order_id = _order_id;

  -- Finally the order
  DELETE FROM orders WHERE id = _order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_order_cascade(uuid) TO authenticated;
