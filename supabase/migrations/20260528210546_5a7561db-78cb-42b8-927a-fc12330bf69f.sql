CREATE OR REPLACE FUNCTION public.suppliers_metrics()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant uuid := public.get_user_tenant_id();
  result json;
BEGIN
  IF v_tenant IS NULL
     OR v_tenant = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid THEN
    RETURN json_build_object(
      'total_suppliers', 0,
      'purchases_this_month', 0,
      'purchases_value_this_month', 0,
      'pending_orders', 0
    );
  END IF;

  SELECT json_build_object(
    'total_suppliers',
      (SELECT COUNT(*) FROM suppliers
        WHERE active = true AND tenant_id = v_tenant),
    'purchases_this_month',
      (SELECT COUNT(*) FROM purchase_orders
        WHERE tenant_id = v_tenant
          AND created_at >= date_trunc('month', CURRENT_DATE)),
    'purchases_value_this_month',
      (SELECT COALESCE(SUM(total), 0) FROM purchase_orders
        WHERE tenant_id = v_tenant
          AND created_at >= date_trunc('month', CURRENT_DATE)
          AND status <> 'cancelado'),
    'pending_orders',
      (SELECT COUNT(*) FROM purchase_orders
        WHERE tenant_id = v_tenant
          AND status IN ('enviado','confirmado','parcial'))
  ) INTO result;
  RETURN result;
END;
$$;