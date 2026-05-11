SET session_replication_role = replica;
DO $$
DECLARE
  v_tenant uuid := '423ab4ec-9741-464b-948f-9edf6297e783';
  v_product_id uuid := (SELECT id FROM products WHERE tenant_id = v_tenant AND code = 'CAD-001');
  v_client_id uuid := (SELECT id FROM clients WHERE tenant_id = v_tenant AND name = 'Cliente Teste E2E');
  v_location_id uuid := (SELECT id FROM stock_locations WHERE tenant_id = v_tenant AND name = 'Estoque Principal');
  v_order_id uuid := (SELECT id FROM orders WHERE tenant_id = v_tenant AND client_id = (SELECT id FROM clients WHERE tenant_id = v_tenant AND name = 'Cliente Teste E2E') LIMIT 1);
BEGIN
  IF v_order_id IS NOT NULL THEN
    DELETE FROM fin_ledger_entries WHERE tenant_id = v_tenant AND order_id = v_order_id;
    DELETE FROM fin_receivables WHERE tenant_id = v_tenant AND order_id = v_order_id;
    DELETE FROM fin_payables WHERE tenant_id = v_tenant AND order_id = v_order_id;
    DELETE FROM fin_origin_links WHERE tenant_id = v_tenant AND origin_id = v_order_id;
    DELETE FROM fin_projects WHERE tenant_id = v_tenant AND order_id = v_order_id;
    DELETE FROM operational_projects WHERE tenant_id = v_tenant AND order_id = v_order_id;
    DELETE FROM order_items WHERE order_id = v_order_id;
    DELETE FROM orders WHERE id = v_order_id;
  END IF;

  IF v_product_id IS NOT NULL THEN
    DELETE FROM stock_movements WHERE tenant_id = v_tenant AND product_id = v_product_id;
    DELETE FROM inv_stock_reservations WHERE product_id = v_product_id;
    DELETE FROM products WHERE id = v_product_id;
  END IF;

  IF v_client_id IS NOT NULL THEN
    DELETE FROM clients WHERE id = v_client_id;
  END IF;
  IF v_location_id IS NOT NULL THEN
    DELETE FROM stock_locations WHERE id = v_location_id;
  END IF;
END $$;
SET session_replication_role = DEFAULT;