CREATE OR REPLACE FUNCTION public.update_financial_entries_on_order_edit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ledger_id uuid;
  v_first_ledger_id uuid;
  v_cost_center_id uuid;
  v_doc_number text;
  v_competence_date date;
  v_expense_ledger_id uuid;
  v_responsible_name text;
  v_chart_account_id uuid;
  v_supplier_id uuid;
  v_centro_custo_name text;
  v_fee_supplier_id uuid;
  v_cc_group RECORD;
  v_total_items_value numeric;
  v_proportion numeric;
  v_proportional_amount numeric;
  v_has_cc_groups boolean := false;
  v_cc_display_name text;
  v_strategic_chart_account_id uuid;
  v_client_name text;
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
    DELETE FROM public.fin_payables WHERE ledger_entry_id IN (SELECT id FROM public.fin_ledger_entries WHERE document_number = 'PED-' || OLD.id::text);
    DELETE FROM public.fin_receivables WHERE ledger_entry_id IN (SELECT id FROM public.fin_ledger_entries WHERE document_number = 'PED-' || OLD.id::text);
    DELETE FROM public.fin_ledger_entries WHERE document_number = 'PED-' || OLD.id::text;
  END IF;

  v_competence_date := COALESCE(NEW.data_emissao::date, NOW()::date);
  v_doc_number := 'PED-' || NEW.id::text;
  SELECT id INTO v_cost_center_id FROM public.fin_cost_centers WHERE name ILIKE '%' || COALESCE(NEW.centro_custo, '') || '%' LIMIT 1;
  SELECT full_name INTO v_responsible_name FROM public.profiles WHERE id = NEW.vendedor_id;
  SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;
  v_chart_account_id := COALESCE(NEW.chart_account_id, (SELECT id FROM public.fin_chart_accounts WHERE code = '1.1' LIMIT 1));

  SELECT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = NEW.id AND centro_custo IS NOT NULL AND centro_custo != '') INTO v_has_cc_groups;
  IF v_has_cc_groups THEN
    SELECT COALESCE(SUM(valor_total), 0) INTO v_total_items_value FROM public.order_items WHERE order_id = NEW.id;
  END IF;

  -- 1. REVENUE
  IF v_has_cc_groups THEN
    v_first_ledger_id := NULL;
    FOR v_cc_group IN
      SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value
      FROM public.order_items oi LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%'
      WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != ''
      GROUP BY oi.centro_custo, cc.id, cc.name
    LOOP
      IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
      v_proportional_amount := NEW.valor_total * v_proportion;
      v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id)
      VALUES ('Receita Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' - ' || COALESCE(v_client_name, '') || ' [CC: ' || v_cc_display_name || ']',
        v_proportional_amount, 'RECEITA', v_competence_date, NULL, v_doc_number, NEW.client_id, 'client', 'ABERTO',
        'Pedido: ' || COALESCE(NEW.order_number::text, '') || ' | Resp: ' || COALESCE(v_responsible_name, '') || ' | CC: ' || v_cc_display_name,
        NEW.vendedor_id, v_cc_group.cc_id, NULL, v_first_ledger_id, v_chart_account_id) RETURNING id INTO v_ledger_id;
      IF v_first_ledger_id IS NULL THEN v_first_ledger_id := v_ledger_id; END IF;
      INSERT INTO public.fin_receivables (customer_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id)
      VALUES (NEW.client_id, v_proportional_amount, v_competence_date, v_competence_date,
        'Receita Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']',
        v_doc_number, v_ledger_id, 'ABERTO', v_cc_group.cc_id, 'Gerado automaticamente via pedido', v_chart_account_id);
    END LOOP;
  ELSE
    INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, payment_method, chart_account_id)
    VALUES ('Receita Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' - ' || COALESCE(v_client_name, ''),
      NEW.valor_total, 'RECEITA', v_competence_date, NULL, v_doc_number, NEW.client_id, 'client', 'ABERTO',
      'Pedido: ' || COALESCE(NEW.order_number::text, '') || ' | Resp: ' || COALESCE(v_responsible_name, ''),
      NEW.vendedor_id, v_cost_center_id, NULL, NULL, v_chart_account_id) RETURNING id INTO v_first_ledger_id;
    INSERT INTO public.fin_receivables (customer_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id)
    VALUES (NEW.client_id, NEW.valor_total, v_competence_date, v_competence_date,
      'Receita Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' - ' || COALESCE(v_client_name, ''),
      v_doc_number, v_first_ledger_id, 'ABERTO', v_cost_center_id, 'Gerado automaticamente via pedido', v_chart_account_id);
  END IF;

  -- 2. Credit Card Fee
  IF NEW.taxa_cartao_valor IS NOT NULL AND NEW.taxa_cartao_valor > 0 AND NEW.taxa_cartao_responsavel = 'tendenci' THEN
    SELECT supplier_id INTO v_fee_supplier_id FROM public.fee_supplier_configs WHERE fee_type = 'cartao' LIMIT 1;
    IF v_has_cc_groups THEN
      FOR v_cc_group IN SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value FROM public.order_items oi LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%' WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != '' GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.taxa_cartao_valor * v_proportion; v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);
        INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
        VALUES ('Taxa Cartão Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.taxa_cartao_percentual::text,'0') || '%) [CC: ' || v_cc_display_name || ']', v_proportional_amount, 'DESPESA', v_competence_date, NULL, v_doc_number, v_fee_supplier_id, 'supplier', 'ABERTO', 'Taxa cartão | CC: ' || v_cc_display_name, NEW.vendedor_id, v_cc_group.cc_id, NULL, v_first_ledger_id) RETURNING id INTO v_expense_ledger_id;
        INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes)
        VALUES (v_fee_supplier_id, v_proportional_amount, v_competence_date, v_competence_date, 'Taxa Cartão Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']', v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id, 'Taxa de cartão');
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
      VALUES ('Taxa Cartão Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.taxa_cartao_percentual::text,'0') || '%)', NEW.taxa_cartao_valor, 'DESPESA', v_competence_date, NULL, v_doc_number, v_fee_supplier_id, 'supplier', 'ABERTO', 'Taxa cartão', NEW.vendedor_id, v_cost_center_id, NULL, v_first_ledger_id) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes)
      VALUES (v_fee_supplier_id, NEW.taxa_cartao_valor, v_competence_date, v_competence_date, 'Taxa Cartão Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text), v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id, 'Taxa de cartão');
    END IF;
  END IF;

  -- 3. Boleto Fee
  IF NEW.taxa_boleto_valor IS NOT NULL AND NEW.taxa_boleto_valor > 0 AND NEW.taxa_boleto_responsavel = 'tendenci' THEN
    SELECT supplier_id INTO v_fee_supplier_id FROM public.fee_supplier_configs WHERE fee_type = 'boleto' LIMIT 1;
    IF v_has_cc_groups THEN
      FOR v_cc_group IN SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value FROM public.order_items oi LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%' WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != '' GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.taxa_boleto_valor * v_proportion; v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);
        INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
        VALUES ('Taxa Boleto Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.taxa_boleto_percentual::text,'0') || '%) [CC: ' || v_cc_display_name || ']', v_proportional_amount, 'DESPESA', v_competence_date, NULL, v_doc_number, v_fee_supplier_id, 'supplier', 'ABERTO', 'Taxa boleto | CC: ' || v_cc_display_name, NEW.vendedor_id, v_cc_group.cc_id, NULL, v_first_ledger_id) RETURNING id INTO v_expense_ledger_id;
        INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes)
        VALUES (v_fee_supplier_id, v_proportional_amount, v_competence_date, v_competence_date, 'Taxa Boleto Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']', v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id, 'Taxa de boleto');
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
      VALUES ('Taxa Boleto Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.taxa_boleto_percentual::text,'0') || '%)', NEW.taxa_boleto_valor, 'DESPESA', v_competence_date, NULL, v_doc_number, v_fee_supplier_id, 'supplier', 'ABERTO', 'Taxa boleto', NEW.vendedor_id, v_cost_center_id, NULL, v_first_ledger_id) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes)
      VALUES (v_fee_supplier_id, NEW.taxa_boleto_valor, v_competence_date, v_competence_date, 'Taxa Boleto Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text), v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id, 'Taxa de boleto');
    END IF;
  END IF;

  -- 4. Payment Link Fee
  IF NEW.taxa_link_valor IS NOT NULL AND NEW.taxa_link_valor > 0 AND NEW.taxa_link_responsavel = 'tendenci' THEN
    SELECT supplier_id INTO v_fee_supplier_id FROM public.fee_supplier_configs WHERE fee_type = 'link' LIMIT 1;
    IF v_has_cc_groups THEN
      FOR v_cc_group IN SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value FROM public.order_items oi LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%' WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != '' GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.taxa_link_valor * v_proportion; v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);
        INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
        VALUES ('Taxa Link Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.taxa_link_percentual::text,'0') || '%) [CC: ' || v_cc_display_name || ']', v_proportional_amount, 'DESPESA', v_competence_date, NULL, v_doc_number, v_fee_supplier_id, 'supplier', 'ABERTO', 'Taxa link | CC: ' || v_cc_display_name, NEW.vendedor_id, v_cc_group.cc_id, NULL, v_first_ledger_id) RETURNING id INTO v_expense_ledger_id;
        INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes)
        VALUES (v_fee_supplier_id, v_proportional_amount, v_competence_date, v_competence_date, 'Taxa Link Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']', v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id, 'Taxa link pagamento');
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
      VALUES ('Taxa Link Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.taxa_link_percentual::text,'0') || '%)', NEW.taxa_link_valor, 'DESPESA', v_competence_date, NULL, v_doc_number, v_fee_supplier_id, 'supplier', 'ABERTO', 'Taxa link pagamento', NEW.vendedor_id, v_cost_center_id, NULL, v_first_ledger_id) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes)
      VALUES (v_fee_supplier_id, NEW.taxa_link_valor, v_competence_date, v_competence_date, 'Taxa Link Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text), v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id, 'Taxa link pagamento');
    END IF;
  END IF;

  -- 5. RT
  IF NEW.rt_valor IS NOT NULL AND NEW.rt_valor > 0 THEN
    SELECT supplier_id INTO v_fee_supplier_id FROM public.fee_supplier_configs WHERE fee_type = 'rt' LIMIT 1;
    SELECT chart_account_id INTO v_strategic_chart_account_id FROM public.fin_strategic_resource_account_configs WHERE resource_type = 'rt' LIMIT 1;
    IF v_has_cc_groups THEN
      FOR v_cc_group IN SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value FROM public.order_items oi LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%' WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != '' GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.rt_valor * v_proportion; v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);
        INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id)
        VALUES ('RT Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.rt_percentual::text,'0') || '%) [CC: ' || v_cc_display_name || ']', v_proportional_amount, 'DESPESA', v_competence_date, NULL, v_doc_number, v_fee_supplier_id, 'supplier', 'ABERTO', 'RT | CC: ' || v_cc_display_name, NEW.vendedor_id, v_cc_group.cc_id, NULL, v_first_ledger_id, v_strategic_chart_account_id) RETURNING id INTO v_expense_ledger_id;
        INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id)
        VALUES (v_fee_supplier_id, v_proportional_amount, v_competence_date, v_competence_date, 'RT Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']', v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id, 'RT', v_strategic_chart_account_id);
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id)
      VALUES ('RT Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.rt_percentual::text,'0') || '%)', NEW.rt_valor, 'DESPESA', v_competence_date, NULL, v_doc_number, v_fee_supplier_id, 'supplier', 'ABERTO', 'RT', NEW.vendedor_id, v_cost_center_id, NULL, v_first_ledger_id, v_strategic_chart_account_id) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id)
      VALUES (v_fee_supplier_id, NEW.rt_valor, v_competence_date, v_competence_date, 'RT Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text), v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id, 'RT', v_strategic_chart_account_id);
    END IF;
  END IF;

  -- 6. Comissão Vendedor
  IF NEW.comissao_vendedor_valor IS NOT NULL AND NEW.comissao_vendedor_valor > 0 THEN
    v_supplier_id := (SELECT supplier_id FROM public.order_responsibles WHERE id = NEW.comissao_vendedor_responsavel_id);
    SELECT chart_account_id INTO v_strategic_chart_account_id FROM public.fin_strategic_resource_account_configs WHERE resource_type = 'vendedor' LIMIT 1;
    IF v_has_cc_groups THEN
      FOR v_cc_group IN SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value FROM public.order_items oi LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%' WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != '' GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.comissao_vendedor_valor * v_proportion; v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);
        INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id)
        VALUES ('Comissão Vendedor Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_vendedor_percentual::text,'0') || '%) [CC: ' || v_cc_display_name || ']', v_proportional_amount, 'DESPESA', v_competence_date, NULL, v_doc_number, v_supplier_id, 'supplier', 'ABERTO', 'Comissão vendedor | CC: ' || v_cc_display_name, NEW.vendedor_id, v_cc_group.cc_id, NULL, v_first_ledger_id, v_strategic_chart_account_id) RETURNING id INTO v_expense_ledger_id;
        INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id)
        VALUES (v_supplier_id, v_proportional_amount, v_competence_date, v_competence_date, 'Comissão Vendedor Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']', v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id, 'Comissão vendedor', v_strategic_chart_account_id);
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id)
      VALUES ('Comissão Vendedor Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_vendedor_percentual::text,'0') || '%)', NEW.comissao_vendedor_valor, 'DESPESA', v_competence_date, NULL, v_doc_number, v_supplier_id, 'supplier', 'ABERTO', 'Comissão vendedor', NEW.vendedor_id, v_cost_center_id, NULL, v_first_ledger_id, v_strategic_chart_account_id) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id)
      VALUES (v_supplier_id, NEW.comissao_vendedor_valor, v_competence_date, v_competence_date, 'Comissão Vendedor Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text), v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id, 'Comissão vendedor', v_strategic_chart_account_id);
    END IF;
  END IF;

  -- 7. Comissão Orçamentista
  IF NEW.comissao_orcamentista_valor IS NOT NULL AND NEW.comissao_orcamentista_valor > 0 THEN
    v_supplier_id := (SELECT supplier_id FROM public.order_responsibles WHERE id = NEW.comissao_orcamentista_responsavel_id);
    SELECT chart_account_id INTO v_strategic_chart_account_id FROM public.fin_strategic_resource_account_configs WHERE resource_type = 'orcamentista' LIMIT 1;
    IF v_has_cc_groups THEN
      FOR v_cc_group IN SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value FROM public.order_items oi LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%' WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != '' GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.comissao_orcamentista_valor * v_proportion; v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);
        INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id)
        VALUES ('Comissão Orçamentista Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_orcamentista_percentual::text,'0') || '%) [CC: ' || v_cc_display_name || ']', v_proportional_amount, 'DESPESA', v_competence_date, NULL, v_doc_number, v_supplier_id, 'supplier', 'ABERTO', 'Comissão orçamentista | CC: ' || v_cc_display_name, NEW.vendedor_id, v_cc_group.cc_id, NULL, v_first_ledger_id, v_strategic_chart_account_id) RETURNING id INTO v_expense_ledger_id;
        INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id)
        VALUES (v_supplier_id, v_proportional_amount, v_competence_date, v_competence_date, 'Comissão Orçamentista Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']', v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id, 'Comissão orçamentista', v_strategic_chart_account_id);
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id)
      VALUES ('Comissão Orçamentista Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_orcamentista_percentual::text,'0') || '%)', NEW.comissao_orcamentista_valor, 'DESPESA', v_competence_date, NULL, v_doc_number, v_supplier_id, 'supplier', 'ABERTO', 'Comissão orçamentista', NEW.vendedor_id, v_cost_center_id, NULL, v_first_ledger_id, v_strategic_chart_account_id) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id)
      VALUES (v_supplier_id, NEW.comissao_orcamentista_valor, v_competence_date, v_competence_date, 'Comissão Orçamentista Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text), v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id, 'Comissão orçamentista', v_strategic_chart_account_id);
    END IF;
  END IF;

  -- 8. Comissão Projetista
  IF NEW.comissao_projetista_valor IS NOT NULL AND NEW.comissao_projetista_valor > 0 THEN
    v_supplier_id := (SELECT supplier_id FROM public.order_responsibles WHERE id = NEW.comissao_projetista_responsavel_id);
    SELECT chart_account_id INTO v_strategic_chart_account_id FROM public.fin_strategic_resource_account_configs WHERE resource_type = 'projetista' LIMIT 1;
    IF v_has_cc_groups THEN
      FOR v_cc_group IN SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value FROM public.order_items oi LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%' WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != '' GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.comissao_projetista_valor * v_proportion; v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);
        INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id)
        VALUES ('Comissão Projetista Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_projetista_percentual::text,'0') || '%) [CC: ' || v_cc_display_name || ']', v_proportional_amount, 'DESPESA', v_competence_date, NULL, v_doc_number, v_supplier_id, 'supplier', 'ABERTO', 'Comissão projetista | CC: ' || v_cc_display_name, NEW.vendedor_id, v_cc_group.cc_id, NULL, v_first_ledger_id, v_strategic_chart_account_id) RETURNING id INTO v_expense_ledger_id;
        INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id)
        VALUES (v_supplier_id, v_proportional_amount, v_competence_date, v_competence_date, 'Comissão Projetista Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']', v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id, 'Comissão projetista', v_strategic_chart_account_id);
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id)
      VALUES ('Comissão Projetista Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_projetista_percentual::text,'0') || '%)', NEW.comissao_projetista_valor, 'DESPESA', v_competence_date, NULL, v_doc_number, v_supplier_id, 'supplier', 'ABERTO', 'Comissão projetista', NEW.vendedor_id, v_cost_center_id, NULL, v_first_ledger_id, v_strategic_chart_account_id) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id)
      VALUES (v_supplier_id, NEW.comissao_projetista_valor, v_competence_date, v_competence_date, 'Comissão Projetista Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text), v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id, 'Comissão projetista', v_strategic_chart_account_id);
    END IF;
  END IF;

  -- 9. Comissão Montador
  IF NEW.comissao_montador_valor IS NOT NULL AND NEW.comissao_montador_valor > 0 THEN
    v_supplier_id := (SELECT supplier_id FROM public.order_responsibles WHERE id = NEW.comissao_montador_responsavel_id);
    SELECT chart_account_id INTO v_strategic_chart_account_id FROM public.fin_strategic_resource_account_configs WHERE resource_type = 'montador' LIMIT 1;
    IF v_has_cc_groups THEN
      FOR v_cc_group IN SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value FROM public.order_items oi LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%' WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != '' GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.comissao_montador_valor * v_proportion; v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);
        INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id)
        VALUES ('Comissão Montador Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_montador_percentual::text,'0') || '%) [CC: ' || v_cc_display_name || ']', v_proportional_amount, 'DESPESA', v_competence_date, NULL, v_doc_number, v_supplier_id, 'supplier', 'ABERTO', 'Comissão montador | CC: ' || v_cc_display_name, NEW.vendedor_id, v_cc_group.cc_id, NULL, v_first_ledger_id, v_strategic_chart_account_id) RETURNING id INTO v_expense_ledger_id;
        INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id)
        VALUES (v_supplier_id, v_proportional_amount, v_competence_date, v_competence_date, 'Comissão Montador Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']', v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id, 'Comissão montador', v_strategic_chart_account_id);
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id)
      VALUES ('Comissão Montador Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_montador_percentual::text,'0') || '%)', NEW.comissao_montador_valor, 'DESPESA', v_competence_date, NULL, v_doc_number, v_supplier_id, 'supplier', 'ABERTO', 'Comissão montador', NEW.vendedor_id, v_cost_center_id, NULL, v_first_ledger_id, v_strategic_chart_account_id) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id)
      VALUES (v_supplier_id, NEW.comissao_montador_valor, v_competence_date, v_competence_date, 'Comissão Montador Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text), v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id, 'Comissão montador', v_strategic_chart_account_id);
    END IF;
  END IF;

  -- 10. Comissão Produção
  IF NEW.comissao_producao_valor IS NOT NULL AND NEW.comissao_producao_valor > 0 THEN
    v_supplier_id := (SELECT supplier_id FROM public.order_responsibles WHERE id = NEW.comissao_producao_responsavel_id);
    SELECT chart_account_id INTO v_strategic_chart_account_id FROM public.fin_strategic_resource_account_configs WHERE resource_type = 'producao' LIMIT 1;
    IF v_has_cc_groups THEN
      FOR v_cc_group IN SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value FROM public.order_items oi LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%' WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != '' GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.comissao_producao_valor * v_proportion; v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);
        INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id)
        VALUES ('Comissão Produção Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_producao_percentual::text,'0') || '%) [CC: ' || v_cc_display_name || ']', v_proportional_amount, 'DESPESA', v_competence_date, NULL, v_doc_number, v_supplier_id, 'supplier', 'ABERTO', 'Comissão produção | CC: ' || v_cc_display_name, NEW.vendedor_id, v_cc_group.cc_id, NULL, v_first_ledger_id, v_strategic_chart_account_id) RETURNING id INTO v_expense_ledger_id;
        INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id)
        VALUES (v_supplier_id, v_proportional_amount, v_competence_date, v_competence_date, 'Comissão Produção Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']', v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id, 'Comissão produção', v_strategic_chart_account_id);
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, chart_account_id)
      VALUES ('Comissão Produção Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_producao_percentual::text,'0') || '%)', NEW.comissao_producao_valor, 'DESPESA', v_competence_date, NULL, v_doc_number, v_supplier_id, 'supplier', 'ABERTO', 'Comissão produção', NEW.vendedor_id, v_cost_center_id, NULL, v_first_ledger_id, v_strategic_chart_account_id) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id)
      VALUES (v_supplier_id, NEW.comissao_producao_valor, v_competence_date, v_competence_date, 'Comissão Produção Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text), v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id, 'Comissão produção', v_strategic_chart_account_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$

;
