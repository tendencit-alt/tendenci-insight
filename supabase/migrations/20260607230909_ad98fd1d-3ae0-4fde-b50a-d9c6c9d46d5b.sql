
CREATE OR REPLACE FUNCTION public.get_bank_dashboard_data()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid;
  _result jsonb;
BEGIN
  _tenant := get_user_tenant_id();
  IF _tenant IS NULL THEN
    RETURN jsonb_build_object('connections', '[]'::jsonb, 'recent_transactions', '[]'::jsonb,
                              'totals', jsonb_build_object('total_balance', 0, 'pending_count', 0));
  END IF;

  SELECT jsonb_build_object(
    'connections', COALESCE((
      SELECT jsonb_agg(c ORDER BY c.created_at DESC) FROM (
        SELECT
          bc.id, bc.bank_name, bc.bank_logo_url, bc.status, bc.last_sync_at,
          bc.pluggy_item_id, bc.last_error_message, bc.created_at,
          COALESCE((SELECT count(*) FROM bank_accounts ba WHERE ba.connection_id = bc.id), 0) AS account_count,
          COALESCE((SELECT sum(ba.balance) FROM bank_accounts ba WHERE ba.connection_id = bc.id), 0) AS total_balance
        FROM bank_connections bc
        WHERE bc.tenant_id = _tenant AND bc.status <> 'deleted'
      ) c
    ), '[]'::jsonb),
    'recent_transactions', COALESCE((
      SELECT jsonb_agg(t) FROM (
        SELECT
          bt.id, bt.date, bt.amount, bt.description, bt.category, bt.merchant_name,
          bt.reconciled_with, bt.reconciled_id, bt.reconciled_at,
          ba.id AS account_id, ba.marketing_name AS account_name, ba.account_type,
          bc.id AS connection_id, bc.bank_name, bc.bank_logo_url
        FROM bank_transactions bt
        JOIN bank_accounts ba ON ba.id = bt.account_id
        JOIN bank_connections bc ON bc.id = ba.connection_id
        WHERE bt.tenant_id = _tenant
        ORDER BY bt.date DESC, bt.created_at DESC
        LIMIT 30
      ) t
    ), '[]'::jsonb),
    'totals', jsonb_build_object(
      'total_balance', COALESCE((SELECT sum(balance) FROM bank_accounts WHERE tenant_id = _tenant), 0),
      'pending_count', COALESCE((SELECT count(*) FROM bank_transactions WHERE tenant_id = _tenant AND reconciled_with IS NULL), 0),
      'last_sync_at', (SELECT max(last_sync_at) FROM bank_connections WHERE tenant_id = _tenant)
    )
  ) INTO _result;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_bank_dashboard_data() TO authenticated;
