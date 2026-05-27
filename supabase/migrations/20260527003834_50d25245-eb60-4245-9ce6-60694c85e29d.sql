DO $$
DECLARE
  v_planejados uuid := '11912d24-f3f2-41cb-8b35-d094352d5995';
  v_mobiliarios uuid := '423ab4ec-9741-464b-948f-9edf6297e783';
  v_recv_doc text;
  v_ledger_doc text;
  v_order_id uuid;
  v_order_tenant uuid;
  v_client_id uuid;
BEGIN
  SELECT document_number INTO v_recv_doc FROM public.fin_receivables WHERE id='b9f91f26-e948-4106-8dbc-f67c153ccfb4';
  SELECT document_number INTO v_ledger_doc FROM public.fin_ledger_entries WHERE id='0527de26-2d56-4f9d-a9b3-041031754a08';

  IF v_recv_doc IS NULL AND v_ledger_doc IS NULL THEN
    RAISE NOTICE 'Órfãos já não existem (provavelmente já corrigidos). Nada a fazer.';
  ELSE
    -- Derivar id do pedido pelo prefixo presente no document_number (formato PED-<8 hex>...)
    SELECT o.id, o.tenant_id, o.client_id
      INTO v_order_id, v_order_tenant, v_client_id
    FROM public.orders o
    WHERE o.id::text LIKE substring(COALESCE(v_recv_doc, v_ledger_doc) FROM 'PED-([0-9a-fA-F]+)') || '%'
    LIMIT 1;

    IF v_order_id IS NULL THEN
      RAISE EXCEPTION 'Pedido referenciado pelos órfãos (doc=%) não encontrado', COALESCE(v_recv_doc, v_ledger_doc);
    END IF;

    IF v_order_tenant <> v_planejados THEN
      RAISE EXCEPTION 'Tenant do pedido (%) difere de Planejados — abortando', v_order_tenant;
    END IF;

    UPDATE public.fin_receivables
       SET tenant_id = v_planejados,
           order_id  = v_order_id,
           customer_id = COALESCE(customer_id, v_client_id),
           updated_at = now()
     WHERE id = 'b9f91f26-e948-4106-8dbc-f67c153ccfb4'
       AND tenant_id IS NULL
       AND COALESCE(amount, 0) = 0;

    UPDATE public.fin_ledger_entries
       SET tenant_id = v_planejados,
           order_id  = v_order_id,
           updated_at = now()
     WHERE id = '0527de26-2d56-4f9d-a9b3-041031754a08'
       AND tenant_id IS NULL
       AND COALESCE(amount, 0) = 0;
  END IF;

  -- Caixa Geral por tenant (idempotente)
  INSERT INTO public.fin_bank_accounts (nickname, bank_name, agency, account_number, opening_balance, opening_balance_date, active, tenant_id)
  SELECT 'Caixa Geral', NULL, NULL, NULL, 0, CURRENT_DATE, true, v_planejados
  WHERE NOT EXISTS (SELECT 1 FROM public.fin_bank_accounts WHERE tenant_id = v_planejados AND nickname = 'Caixa Geral');

  INSERT INTO public.fin_bank_accounts (nickname, bank_name, agency, account_number, opening_balance, opening_balance_date, active, tenant_id)
  SELECT 'Caixa Geral', NULL, NULL, NULL, 0, CURRENT_DATE, true, v_mobiliarios
  WHERE NOT EXISTS (SELECT 1 FROM public.fin_bank_accounts WHERE tenant_id = v_mobiliarios AND nickname = 'Caixa Geral');
END $$;

DROP TABLE IF EXISTS public._diag_orphans_audit;