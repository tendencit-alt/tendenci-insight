
-- 1. Snapshot pre-cleanup counts no audit_log
DO $$
DECLARE
  v_owner uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;
  v_payload jsonb;
BEGIN
  SELECT jsonb_build_object(
    'hr_employees', (SELECT COUNT(*) FROM hr_employees WHERE tenant_id=v_owner),
    'hr_time_records', (SELECT COUNT(*) FROM hr_time_records WHERE tenant_id=v_owner),
    'suppliers', (SELECT COUNT(*) FROM suppliers WHERE tenant_id=v_owner),
    'clients', (SELECT COUNT(*) FROM clients WHERE tenant_id=v_owner),
    'orders', (SELECT COUNT(*) FROM orders WHERE tenant_id=v_owner),
    'deals', (SELECT COUNT(*) FROM deals WHERE tenant_id=v_owner),
    'fin_payables', (SELECT COUNT(*) FROM fin_payables WHERE tenant_id=v_owner),
    'fin_receivables', (SELECT COUNT(*) FROM fin_receivables WHERE tenant_id=v_owner),
    'fin_ledger_entries', (SELECT COUNT(*) FROM fin_ledger_entries WHERE tenant_id=v_owner)
  ) INTO v_payload;

  INSERT INTO public.audit_log(tenant_id, table_name, record_id, event_type, event_source, metadata)
  VALUES (v_owner, 'tenants', v_owner, 'OWNER_OPS_CLEANUP_SNAPSHOT', 'migration', v_payload);
END $$;

-- 2. Cleanup transacional dos dados operacionais do Owner
DO $$
DECLARE v_owner uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;
BEGIN
  DELETE FROM public.hr_time_records       WHERE tenant_id=v_owner;
  DELETE FROM public.hr_absences           WHERE tenant_id=v_owner;
  DELETE FROM public.hr_medical_certificates WHERE tenant_id=v_owner;
  DELETE FROM public.hr_employees          WHERE tenant_id=v_owner;
  DELETE FROM public.service_provider_documents WHERE tenant_id=v_owner;
  DELETE FROM public.service_providers     WHERE tenant_id=v_owner;
  DELETE FROM public.fin_bank_transactions WHERE tenant_id=v_owner;
  DELETE FROM public.fin_ledger_entries    WHERE tenant_id=v_owner;
  DELETE FROM public.fin_recurring_contracts WHERE tenant_id=v_owner;
  DELETE FROM public.fin_payables          WHERE tenant_id=v_owner;
  DELETE FROM public.fin_receivables       WHERE tenant_id=v_owner;
  DELETE FROM public.production_orders     WHERE tenant_id=v_owner;
  DELETE FROM public.delivery_orders       WHERE tenant_id=v_owner;
  DELETE FROM public.installation_orders   WHERE tenant_id=v_owner;
  DELETE FROM public.ops_orders            WHERE tenant_id=v_owner;
  DELETE FROM public.stock_movements       WHERE tenant_id=v_owner;
  DELETE FROM public.inv_stock_reservations WHERE tenant_id=v_owner;
  DELETE FROM public.purchase_orders       WHERE tenant_id=v_owner;
  DELETE FROM public.order_responsibles    WHERE tenant_id=v_owner;
  DELETE FROM public.orders                WHERE tenant_id=v_owner;
  DELETE FROM public.deals                 WHERE tenant_id=v_owner;
  DELETE FROM public.clients               WHERE tenant_id=v_owner;
  DELETE FROM public.suppliers             WHERE tenant_id=v_owner;
  DELETE FROM public.cross_module_events   WHERE tenant_id=v_owner;
END $$;

-- 3. Guard function
CREATE OR REPLACE FUNCTION public.block_operational_on_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid THEN
    RAISE EXCEPTION 'Master Owner é apenas estrutura/templates. Dado operacional não é permitido em %.', TG_TABLE_NAME
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

-- 4. Aplica triggers BEFORE INSERT em todas as tabelas operacionais
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'orders','order_responsibles','deals',
    'fin_payables','fin_receivables','fin_ledger_entries','fin_bank_transactions','fin_recurring_contracts',
    'production_orders','delivery_orders','installation_orders','ops_orders',
    'purchase_orders','stock_movements','inv_stock_reservations',
    'hr_employees','hr_time_records','hr_absences','hr_medical_certificates',
    'service_providers','service_provider_documents',
    'clients','suppliers','products','cross_module_events'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_block_ops_on_owner ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_block_ops_on_owner BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.block_operational_on_owner()', t);
  END LOOP;
END $$;
