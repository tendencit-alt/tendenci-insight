
-- =========================================================
-- PLUGGY INTEGRATION - ROUND 1: Schema + RLS
-- =========================================================

-- 1) bank_connections
CREATE TABLE public.bank_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pluggy_item_id text NOT NULL UNIQUE,
  pluggy_connector_id integer NOT NULL,
  bank_name text NOT NULL,
  bank_logo_url text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','login_required','outdated','error','deleted')),
  last_sync_at timestamptz,
  last_error_message text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bank_connections_tenant_idx ON public.bank_connections(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_connections TO authenticated;
GRANT ALL ON public.bank_connections TO service_role;

ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bc_select" ON public.bank_connections
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE POLICY "bc_insert" ON public.bank_connections
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE POLICY "bc_update" ON public.bank_connections
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_owner())
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE POLICY "bc_delete" ON public.bank_connections
  FOR DELETE TO authenticated
  USING ((tenant_id = public.get_user_tenant_id() AND public.is_tenant_admin(tenant_id)) OR public.is_owner());

CREATE TRIGGER bank_connections_updated_at
  BEFORE UPDATE ON public.bank_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2) bank_accounts
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pluggy_account_id text NOT NULL UNIQUE,
  account_type text NOT NULL CHECK (account_type IN ('CHECKING','SAVINGS','CREDIT','INVESTMENT')),
  account_subtype text,
  agency text,
  account_number text,
  balance numeric(15,2) NOT NULL DEFAULT 0,
  currency_code text NOT NULL DEFAULT 'BRL',
  marketing_name text,
  owner_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bank_accounts_tenant_idx ON public.bank_accounts(tenant_id);
CREATE INDEX bank_accounts_connection_idx ON public.bank_accounts(connection_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ba_select" ON public.bank_accounts
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE POLICY "ba_insert" ON public.bank_accounts
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE POLICY "ba_update" ON public.bank_accounts
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_owner())
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE POLICY "ba_delete" ON public.bank_accounts
  FOR DELETE TO authenticated
  USING ((tenant_id = public.get_user_tenant_id() AND public.is_tenant_admin(tenant_id)) OR public.is_owner());

CREATE TRIGGER bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3) bank_transactions
CREATE TABLE public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  pluggy_transaction_id text NOT NULL UNIQUE,
  date date NOT NULL,
  amount numeric(15,2) NOT NULL,
  description text NOT NULL,
  category text,
  category_id text,
  merchant_name text,
  payment_data jsonb,
  reconciled_with text CHECK (reconciled_with IS NULL OR reconciled_with IN ('fin_receivable','fin_payable')),
  reconciled_id uuid,
  reconciled_at timestamptz,
  reconciled_by uuid REFERENCES auth.users(id),
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bank_transactions_tenant_idx ON public.bank_transactions(tenant_id);
CREATE INDEX bank_transactions_account_idx ON public.bank_transactions(account_id);
CREATE INDEX bank_transactions_date_idx ON public.bank_transactions(date DESC);
CREATE INDEX bank_transactions_reconciled_idx ON public.bank_transactions(reconciled_with, reconciled_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT ALL ON public.bank_transactions TO service_role;

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bt_select" ON public.bank_transactions
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE POLICY "bt_insert" ON public.bank_transactions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE POLICY "bt_update" ON public.bank_transactions
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id() OR public.is_owner())
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE POLICY "bt_delete" ON public.bank_transactions
  FOR DELETE TO authenticated
  USING ((tenant_id = public.get_user_tenant_id() AND public.is_tenant_admin(tenant_id)) OR public.is_owner());

CREATE TRIGGER bank_transactions_updated_at
  BEFORE UPDATE ON public.bank_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 4) RPC helper for frontend dashboard
CREATE OR REPLACE FUNCTION public.get_pluggy_connections_for_user()
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  pluggy_item_id text,
  pluggy_connector_id integer,
  bank_name text,
  bank_logo_url text,
  status text,
  last_sync_at timestamptz,
  last_error_message text,
  created_at timestamptz,
  account_count bigint,
  total_balance numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    bc.id,
    bc.tenant_id,
    bc.pluggy_item_id,
    bc.pluggy_connector_id,
    bc.bank_name,
    bc.bank_logo_url,
    bc.status,
    bc.last_sync_at,
    bc.last_error_message,
    bc.created_at,
    COALESCE(COUNT(ba.id), 0)::bigint AS account_count,
    COALESCE(SUM(ba.balance), 0)::numeric AS total_balance
  FROM public.bank_connections bc
  LEFT JOIN public.bank_accounts ba ON ba.connection_id = bc.id
  WHERE bc.tenant_id = public.get_user_tenant_id() OR public.is_owner()
  GROUP BY bc.id
  ORDER BY bc.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_pluggy_connections_for_user() TO authenticated;
