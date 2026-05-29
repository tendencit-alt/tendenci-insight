-- 1) Add cost_center_id to fee_supplier_configs
ALTER TABLE public.fee_supplier_configs
  ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.fin_cost_centers(id) ON DELETE SET NULL;

-- 2) Update trigger to: (a) filter fee_supplier_configs by tenant_id,
--    (b) match the actual fee_type names used by the UI,
--    (c) use configured cost_center_id (fallback to order's cost center)
CREATE OR REPLACE FUNCTION public.update_financial_entries_on_order_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_ledger_id uuid;
  v_first_ledger_id uuid;
  v_cost_center_id uuid;
  v_doc_number text;
  v_competence_date date;
  v_first_due_date date;
  v_expense_ledger_id uuid;
  v_responsible_name text;
  v_chart_account_id uuid;
  v_fee_supplier_id uuid;
  v_fee_chart_account_id uuid;
  v_fee_cost_center_id uuid;
  v_fee_cc_final uuid;
  v_cc_group RECORD;
  v_total_items_value numeric;
  v_proportion numeric;
  v_proportional_amount numeric;
  v_has_cc_groups boolean := false;
  v_cc_display_name text;
  v_client_name text;
  v_installments int;
  v_interval_days int;
  v_i int;
  v_installment_amount numeric;
  v_installment_due date;
  v_parcelas_json jsonb;
  v_parcela jsonb;
  v_p_pct numeric;
  v_p_due date;
  v_p_subn int;
  v_p_base numeric;
  v_sub_i int;
  v_sub_amount numeric;
  v_global_idx int;
  v_global_total int;
  v_label_suffix text;
  v_card_fee_type text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('ativo', 'faturado', 'em_producao') THEN RETURN NEW; END IF;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NOT (
      (NEW.status IN ('ativo', 'faturado', 'em_producao') AND OLD.status IN ('ativo', 'faturado', 'em_producao'))
      OR (NEW.status IN ('ativo', 'faturado', 'em_producao') AND OLD.status IN ('rascunho'))
    ) THEN RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    DELETE FROM public.fin_payables
      WHERE ledger_entry_id IN (
        SELECT id FROM public.fin_ledger_entries
        WHERE order_id = OLD.id AND COALESCE(origem,'') <> 'order_strategic_commitment'
      );
    DELETE FROM public.fin_receivables WHERE order_id = OLD.id;
    DELETE FROM public.fin_ledger_entries
      WHERE order_id = OLD.id AND COALESCE(origem,'') <> 'order_strategic_commitment';
  END IF;

  v_competence_date := COALESCE(NEW.data_pedido::date, CURRENT_DATE);
  v_first_due_date := COALESCE(NEW.data_entrega::date, v_competence_date + 30);
  v_doc_number := 'PED-' || COALESCE(NEW.order_number::text, NEW.id::text);

  SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;
  SELECT name INTO v_responsible_name FROM public.order_responsibles WHERE id = NEW.vendedor_id;

  SELECT id INTO v_cost_center_id
  FROM public.fin_cost_centers
  WHERE tenant_id = NEW.tenant_id AND active = true
  ORDER BY (CASE WHEN lower(name) LIKE '%planejado%' THEN 0 ELSE 1 END), code
  LIMIT 1;

  v_chart_account_id := NULL;
  SELECT id INTO v_chart_account_id
  FROM public.fin_chart_accounts
  WHERE tenant_id = NEW.tenant_id AND active = true AND code LIKE '4.1%'
  ORDER BY code LIMIT 1;

  v_installments := COALESCE(NEW.numero_parcelas_cartao, 1);
  v_interval_days := 30;

  IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
    FOR v_i IN 1..v_installments LOOP
      IF v_i = v_installments THEN
        v_installment_amount := NEW.valor_total - (ROUND(NEW.valor_total / v_installments, 2) * (v_installments - 1));
      ELSE
        v_installment_amount := ROUND(NEW.valor_total / v_installments, 2);
      END IF;
      v_installment_due := v_first_due_date + ((v_i - 1) * v_interval_days);
      v_label_suffix := CASE WHEN v_installments > 1 THEN ' (' || v_i || '/' || v_installments || ')' ELSE '' END;

      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, document_number,
        party_id, party_type, status, notes, created_by, cost_center_id, project_id,
        parent_entry_id, payment_method, chart_account_id, installment_number, total_installments,
        tenant_id, order_id, client_id, vendedor_id
      )
      VALUES (
        'Receita Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' - ' || COALESCE(v_client_name, '') || v_label_suffix,
        v_installment_amount, 'RECEITA', v_installment_due, NULL, v_doc_number, NEW.client_id, 'client', 'ABERTO',
        'Pedido: ' || COALESCE(NEW.order_number::text, '') || ' | Resp: ' || COALESCE(v_responsible_name, ''),
        NEW.vendedor_id, v_cost_center_id, NEW.project_id, v_first_ledger_id, NULL, v_chart_account_id, v_i, v_installments,
        NEW.tenant_id, NEW.id, NEW.client_id, NEW.vendedor_id
      )
      RETURNING id INTO v_ledger_id;
      IF v_first_ledger_id IS NULL THEN v_first_ledger_id := v_ledger_id; END IF;

      INSERT INTO public.fin_receivables (customer_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id, installment, total_installments, order_id, tenant_id)
      VALUES (NEW.client_id, v_installment_amount, v_installment_due, v_installment_due,
        'Receita Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' - ' || COALESCE(v_client_name, '') || v_label_suffix,
        v_doc_number, v_ledger_id, 'ABERTO', v_cost_center_id, 'Gerado automaticamente via pedido', v_chart_account_id,
        v_i, v_installments, NEW.id, NEW.tenant_id);
    END LOOP;
  END IF;

  -- ====== Card fee ======
  IF NEW.taxa_cartao_valor IS NOT NULL AND NEW.taxa_cartao_valor > 0 AND NEW.taxa_cartao_responsavel = 'tendenci' THEN
    v_card_fee_type := CASE WHEN COALESCE(NEW.numero_parcelas_cartao, 1) <= 1 THEN 'cartao_debito' ELSE 'cartao_credito' END;
    SELECT supplier_id, chart_account_id, cost_center_id
      INTO v_fee_supplier_id, v_fee_chart_account_id, v_fee_cost_center_id
      FROM public.fee_supplier_configs
      WHERE tenant_id = NEW.tenant_id AND fee_type = v_card_fee_type
      LIMIT 1;
    -- Fallback to legacy 'cartao'
    IF v_fee_supplier_id IS NULL AND v_fee_chart_account_id IS NULL THEN
      SELECT supplier_id, chart_account_id, cost_center_id
        INTO v_fee_supplier_id, v_fee_chart_account_id, v_fee_cost_center_id
        FROM public.fee_supplier_configs
        WHERE tenant_id = NEW.tenant_id AND fee_type = 'cartao'
        LIMIT 1;
    END IF;
    v_fee_cc_final := COALESCE(v_fee_cost_center_id, v_cost_center_id);

    INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id, tenant_id, order_id)
    VALUES ('Taxa Cartão Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.taxa_cartao_percentual::text,'0') || '%)', NEW.taxa_cartao_valor, 'DESPESA', v_competence_date, NULL, v_doc_number || '/TX-CARTAO', v_fee_supplier_id, 'supplier', 'ABERTO', 'Taxa cartão', NEW.vendedor_id, v_fee_cc_final, NULL, v_first_ledger_id, v_fee_chart_account_id, NEW.tenant_id, NEW.id) RETURNING id INTO v_expense_ledger_id;
    INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, chart_account_id, notes, tenant_id, order_id)
    VALUES (v_fee_supplier_id, NEW.taxa_cartao_valor, v_first_due_date, v_competence_date, 'Taxa Cartão Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text), v_doc_number || '/TX-CARTAO', v_expense_ledger_id, 'ABERTO', v_fee_cc_final, v_fee_chart_account_id, 'Taxa de cartão', NEW.tenant_id, NEW.id);
  END IF;

  -- ====== Boleto fee ======
  IF NEW.taxa_boleto_valor IS NOT NULL AND NEW.taxa_boleto_valor > 0 AND NEW.taxa_boleto_responsavel = 'tendenci' THEN
    SELECT supplier_id, chart_account_id, cost_center_id
      INTO v_fee_supplier_id, v_fee_chart_account_id, v_fee_cost_center_id
      FROM public.fee_supplier_configs
      WHERE tenant_id = NEW.tenant_id AND fee_type = 'boleto'
      LIMIT 1;
    v_fee_cc_final := COALESCE(v_fee_cost_center_id, v_cost_center_id);

    INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id, tenant_id, order_id)
    VALUES ('Taxa Boleto Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.taxa_boleto_percentual::text,'0') || '%)', NEW.taxa_boleto_valor, 'DESPESA', v_competence_date, NULL, v_doc_number || '/TX-BOLETO', v_fee_supplier_id, 'supplier', 'ABERTO', 'Taxa boleto', NEW.vendedor_id, v_fee_cc_final, NULL, v_first_ledger_id, v_fee_chart_account_id, NEW.tenant_id, NEW.id) RETURNING id INTO v_expense_ledger_id;
    INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, chart_account_id, notes, tenant_id, order_id)
    VALUES (v_fee_supplier_id, NEW.taxa_boleto_valor, v_first_due_date, v_competence_date, 'Taxa Boleto Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text), v_doc_number || '/TX-BOLETO', v_expense_ledger_id, 'ABERTO', v_fee_cc_final, v_fee_chart_account_id, 'Taxa de boleto', NEW.tenant_id, NEW.id);
  END IF;

  -- ====== Payment Link fee ======
  IF NEW.taxa_link_valor IS NOT NULL AND NEW.taxa_link_valor > 0 AND NEW.taxa_link_responsavel = 'tendenci' THEN
    SELECT supplier_id, chart_account_id, cost_center_id
      INTO v_fee_supplier_id, v_fee_chart_account_id, v_fee_cost_center_id
      FROM public.fee_supplier_configs
      WHERE tenant_id = NEW.tenant_id AND fee_type = 'link_pagamento'
      LIMIT 1;
    IF v_fee_supplier_id IS NULL AND v_fee_chart_account_id IS NULL THEN
      SELECT supplier_id, chart_account_id, cost_center_id
        INTO v_fee_supplier_id, v_fee_chart_account_id, v_fee_cost_center_id
        FROM public.fee_supplier_configs
        WHERE tenant_id = NEW.tenant_id AND fee_type = 'link'
        LIMIT 1;
    END IF;
    v_fee_cc_final := COALESCE(v_fee_cost_center_id, v_cost_center_id);

    INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id, tenant_id, order_id)
    VALUES ('Taxa Link Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.taxa_link_percentual::text,'0') || '%)', NEW.taxa_link_valor, 'DESPESA', v_competence_date, NULL, v_doc_number || '/TX-LINK', v_fee_supplier_id, 'supplier', 'ABERTO', 'Taxa link', NEW.vendedor_id, v_fee_cc_final, NULL, v_first_ledger_id, v_fee_chart_account_id, NEW.tenant_id, NEW.id) RETURNING id INTO v_expense_ledger_id;
    INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, chart_account_id, notes, tenant_id, order_id)
    VALUES (v_fee_supplier_id, NEW.taxa_link_valor, v_first_due_date, v_competence_date, 'Taxa Link Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text), v_doc_number || '/TX-LINK', v_expense_ledger_id, 'ABERTO', v_fee_cc_final, v_fee_chart_account_id, 'Taxa de link', NEW.tenant_id, NEW.id);
  END IF;

  RETURN NEW;
END;
$function$;