-- Replace cryptic UUID-based document numbers with human-readable ones
-- Orders generate: PED-<order_number>  (with installment suffix in description)
-- Strategic commitments generate: PED-<order_number>/<chart_account_code>

-- 1) Order trigger function: friendly doc + cleanup by order_id
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
    -- Cleanup by order_id (works regardless of document_number format)
    DELETE FROM public.fin_payables
      WHERE ledger_entry_id IN (
        SELECT id FROM public.fin_ledger_entries
        WHERE order_id = OLD.id AND COALESCE(origem,'') <> 'order_strategic_commitment'
      );
    DELETE FROM public.fin_receivables WHERE order_id = OLD.id;
    DELETE FROM public.fin_ledger_entries
      WHERE order_id = OLD.id AND COALESCE(origem,'') <> 'order_strategic_commitment';
  END IF;

  v_competence_date := COALESCE(NEW.data_emissao::date, NOW()::date);
  v_first_due_date  := COALESCE(NEW.data_primeiro_vencimento, v_competence_date);
  v_doc_number := 'PED-' || COALESCE(NEW.order_number::text, NEW.id::text);
  SELECT id INTO v_cost_center_id FROM public.fin_cost_centers WHERE name ILIKE '%' || COALESCE(NEW.centro_custo, '') || '%' LIMIT 1;
  SELECT full_name INTO v_responsible_name FROM public.profiles WHERE id = NEW.vendedor_id;
  SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;
  v_chart_account_id := COALESCE(NEW.chart_account_id, (SELECT id FROM public.fin_chart_accounts WHERE code = '1.1' LIMIT 1));

  v_installments := GREATEST(COALESCE(NEW.parcelas, 1), 1);
  v_interval_days := 30;

  v_parcelas_json := NULL;
  IF NEW.observacao_pagamento IS NOT NULL
     AND length(btrim(NEW.observacao_pagamento)) > 0
     AND left(btrim(NEW.observacao_pagamento), 1) = '[' THEN
    BEGIN
      v_parcelas_json := NEW.observacao_pagamento::jsonb;
      IF jsonb_typeof(v_parcelas_json) <> 'array' OR jsonb_array_length(v_parcelas_json) = 0 THEN
        v_parcelas_json := NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_parcelas_json := NULL;
    END;
  END IF;

  v_global_total := 0;
  IF v_parcelas_json IS NOT NULL THEN
    FOR v_parcela IN SELECT * FROM jsonb_array_elements(v_parcelas_json) LOOP
      v_global_total := v_global_total + GREATEST(COALESCE((v_parcela->>'numero_parcelas')::int, 1), 1);
    END LOOP;
  ELSE
    v_global_total := v_installments;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = NEW.id AND centro_custo IS NOT NULL AND centro_custo != '') INTO v_has_cc_groups;
  IF v_has_cc_groups THEN
    SELECT COALESCE(SUM(valor_total), 0) INTO v_total_items_value FROM public.order_items WHERE order_id = NEW.id;
  END IF;

  IF v_has_cc_groups THEN
    FOR v_cc_group IN
      SELECT oi.centro_custo as cc_name, cc.id as cc_id, cc.name as cc_display, SUM(oi.valor_total) as cc_total
      FROM public.order_items oi
      LEFT JOIN public.fin_cost_centers cc ON LOWER(cc.name) = LOWER(CASE oi.centro_custo
            WHEN 'moveis_planejados' THEN 'Planejados'
            WHEN 'producao_tendenci' THEN 'Produção Tendenci'
            WHEN 'revenda' THEN 'Revenda'
            ELSE oi.centro_custo END)
      WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != ''
      GROUP BY oi.centro_custo, cc.id, cc.name
    LOOP
      v_cc_display_name := COALESCE(v_cc_group.cc_display, v_cc_group.cc_name);
      v_proportion := CASE WHEN v_total_items_value > 0 THEN v_cc_group.cc_total / v_total_items_value ELSE 1 END;
      v_proportional_amount := ROUND(NEW.valor_total * v_proportion, 2);
      v_global_idx := 0;
      IF v_parcelas_json IS NOT NULL THEN
        FOR v_parcela IN SELECT * FROM jsonb_array_elements(v_parcelas_json) LOOP
          v_p_pct  := COALESCE((v_parcela->>'percentual')::numeric, 0);
          v_p_due  := COALESCE(NULLIF(v_parcela->>'data_vencimento','')::date, v_first_due_date);
          v_p_subn := GREATEST(COALESCE((v_parcela->>'numero_parcelas')::int, 1), 1);
          v_p_base := ROUND(v_proportional_amount * v_p_pct / 100.0, 2);

          FOR v_sub_i IN 1..v_p_subn LOOP
            v_global_idx := v_global_idx + 1;
            IF v_sub_i = v_p_subn THEN
              v_sub_amount := ROUND(v_p_base - ROUND(v_p_base / v_p_subn, 2) * (v_p_subn - 1), 2);
            ELSE
              v_sub_amount := ROUND(v_p_base / v_p_subn, 2);
            END IF;
            v_installment_due := v_p_due + ((v_sub_i - 1) * 30);
            v_label_suffix := CASE WHEN v_global_total > 1 THEN ' (' || v_global_idx || '/' || v_global_total || ')' ELSE '' END;

            INSERT INTO public.fin_ledger_entries (
              description, amount, type, competence_date, cash_date, document_number,
              party_id, party_type, status, notes, created_by, cost_center_id, project_id,
              parent_entry_id, chart_account_id, installment_number, total_installments,
              tenant_id, order_id, client_id, vendedor_id
            )
            VALUES (
              'Receita Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' - ' || COALESCE(v_client_name, '') || ' [CC: ' || v_cc_display_name || ']' || v_label_suffix,
              v_sub_amount, 'RECEITA', v_installment_due, NULL, v_doc_number,
              NEW.client_id, 'client', 'ABERTO',
              'Pedido: ' || COALESCE(NEW.order_number::text, '') || ' | Resp: ' || COALESCE(v_responsible_name, '') || ' | CC: ' || v_cc_display_name,
              NEW.vendedor_id, v_cc_group.cc_id, NEW.project_id, v_first_ledger_id, v_chart_account_id, v_global_idx, v_global_total,
              NEW.tenant_id, NEW.id, NEW.client_id, NEW.vendedor_id
            )
            RETURNING id INTO v_ledger_id;
            IF v_first_ledger_id IS NULL THEN v_first_ledger_id := v_ledger_id; END IF;

            INSERT INTO public.fin_receivables (customer_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id, installment, total_installments, order_id, tenant_id)
            VALUES (NEW.client_id, v_sub_amount, v_installment_due, v_installment_due,
              'Receita Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']' || v_label_suffix,
              v_doc_number, v_ledger_id, 'ABERTO', v_cc_group.cc_id, 'Gerado automaticamente via pedido', v_chart_account_id,
              v_global_idx, v_global_total, NEW.id, NEW.tenant_id);
          END LOOP;
        END LOOP;
      ELSE
        FOR v_i IN 1..v_installments LOOP
          IF v_i = v_installments THEN
            v_installment_amount := ROUND(v_proportional_amount - ROUND(v_proportional_amount / v_installments, 2) * (v_installments - 1), 2);
          ELSE
            v_installment_amount := ROUND(v_proportional_amount / v_installments, 2);
          END IF;
          v_installment_due := v_first_due_date + ((v_i - 1) * v_interval_days);
          v_label_suffix := CASE WHEN v_installments > 1 THEN ' (' || v_i || '/' || v_installments || ')' ELSE '' END;

          INSERT INTO public.fin_ledger_entries (
            description, amount, type, competence_date, cash_date, document_number,
            party_id, party_type, status, notes, created_by, cost_center_id, project_id,
            parent_entry_id, chart_account_id, installment_number, total_installments,
            tenant_id, order_id, client_id, vendedor_id
          )
          VALUES (
            'Receita Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' - ' || COALESCE(v_client_name, '') || ' [CC: ' || v_cc_display_name || ']' || v_label_suffix,
            v_installment_amount, 'RECEITA', v_installment_due, NULL, v_doc_number, NEW.client_id, 'client', 'ABERTO',
            'Pedido: ' || COALESCE(NEW.order_number::text, '') || ' | Resp: ' || COALESCE(v_responsible_name, '') || ' | CC: ' || v_cc_display_name,
            NEW.vendedor_id, v_cc_group.cc_id, NEW.project_id, v_first_ledger_id, v_chart_account_id, v_i, v_installments,
            NEW.tenant_id, NEW.id, NEW.client_id, NEW.vendedor_id
          )
          RETURNING id INTO v_ledger_id;
          IF v_first_ledger_id IS NULL THEN v_first_ledger_id := v_ledger_id; END IF;

          INSERT INTO public.fin_receivables (customer_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id, installment, total_installments, order_id, tenant_id)
          VALUES (NEW.client_id, v_installment_amount, v_installment_due, v_installment_due,
            'Receita Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']' || v_label_suffix,
            v_doc_number, v_ledger_id, 'ABERTO', v_cc_group.cc_id, 'Gerado automaticamente via pedido', v_chart_account_id,
            v_i, v_installments, NEW.id, NEW.tenant_id);
        END LOOP;
      END IF;
    END LOOP;
  ELSE
    v_global_idx := 0;
    IF v_parcelas_json IS NOT NULL THEN
      FOR v_parcela IN SELECT * FROM jsonb_array_elements(v_parcelas_json) LOOP
        v_p_pct  := COALESCE((v_parcela->>'percentual')::numeric, 0);
        v_p_due  := COALESCE(NULLIF(v_parcela->>'data_vencimento','')::date, v_first_due_date);
        v_p_subn := GREATEST(COALESCE((v_parcela->>'numero_parcelas')::int, 1), 1);
        v_p_base := ROUND(NEW.valor_total * v_p_pct / 100.0, 2);

        FOR v_sub_i IN 1..v_p_subn LOOP
          v_global_idx := v_global_idx + 1;
          IF v_sub_i = v_p_subn THEN
            v_sub_amount := ROUND(v_p_base - ROUND(v_p_base / v_p_subn, 2) * (v_p_subn - 1), 2);
          ELSE
            v_sub_amount := ROUND(v_p_base / v_p_subn, 2);
          END IF;
          v_installment_due := v_p_due + ((v_sub_i - 1) * 30);
          v_label_suffix := CASE WHEN v_global_total > 1 THEN ' (' || v_global_idx || '/' || v_global_total || ')' ELSE '' END;

          INSERT INTO public.fin_ledger_entries (
            description, amount, type, competence_date, cash_date, document_number,
            party_id, party_type, status, notes, created_by, cost_center_id, project_id,
            parent_entry_id, payment_method, chart_account_id, installment_number, total_installments,
            tenant_id, order_id, client_id, vendedor_id
          )
          VALUES (
            'Receita Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' - ' || COALESCE(v_client_name, '') || v_label_suffix,
            v_sub_amount, 'RECEITA', v_installment_due, NULL, v_doc_number, NEW.client_id, 'client', 'ABERTO',
            'Pedido: ' || COALESCE(NEW.order_number::text, '') || ' | Resp: ' || COALESCE(v_responsible_name, ''),
            NEW.vendedor_id, v_cost_center_id, NEW.project_id, v_first_ledger_id, NULL, v_chart_account_id, v_global_idx, v_global_total,
            NEW.tenant_id, NEW.id, NEW.client_id, NEW.vendedor_id
          )
          RETURNING id INTO v_ledger_id;
          IF v_first_ledger_id IS NULL THEN v_first_ledger_id := v_ledger_id; END IF;

          INSERT INTO public.fin_receivables (customer_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id, installment, total_installments, order_id, tenant_id)
          VALUES (NEW.client_id, v_sub_amount, v_installment_due, v_installment_due,
            'Receita Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' - ' || COALESCE(v_client_name, '') || v_label_suffix,
            v_doc_number, v_ledger_id, 'ABERTO', v_cost_center_id, 'Gerado automaticamente via pedido', v_chart_account_id,
            v_global_idx, v_global_total, NEW.id, NEW.tenant_id);
        END LOOP;
      END LOOP;
    ELSE
      FOR v_i IN 1..v_installments LOOP
        IF v_i = v_installments THEN
          v_installment_amount := ROUND(NEW.valor_total - ROUND(NEW.valor_total / v_installments, 2) * (v_installments - 1), 2);
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
  END IF;

  IF NEW.taxa_cartao_valor IS NOT NULL AND NEW.taxa_cartao_valor > 0 AND NEW.taxa_cartao_responsavel = 'tendenci' THEN
    SELECT supplier_id INTO v_fee_supplier_id FROM public.fee_supplier_configs WHERE fee_type = 'cartao' LIMIT 1;
    INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, tenant_id, order_id)
    VALUES ('Taxa Cartão Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.taxa_cartao_percentual::text,'0') || '%)', NEW.taxa_cartao_valor, 'DESPESA', v_competence_date, NULL, v_doc_number || '/TX-CARTAO', v_fee_supplier_id, 'supplier', 'ABERTO', 'Taxa cartão', NEW.vendedor_id, v_cost_center_id, NULL, v_first_ledger_id, NEW.tenant_id, NEW.id) RETURNING id INTO v_expense_ledger_id;
    INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, tenant_id, order_id)
    VALUES (v_fee_supplier_id, NEW.taxa_cartao_valor, v_first_due_date, v_competence_date, 'Taxa Cartão Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text), v_doc_number || '/TX-CARTAO', v_expense_ledger_id, 'ABERTO', v_cost_center_id, 'Taxa de cartão', NEW.tenant_id, NEW.id);
  END IF;

  IF NEW.taxa_boleto_valor IS NOT NULL AND NEW.taxa_boleto_valor > 0 AND NEW.taxa_boleto_responsavel = 'tendenci' THEN
    SELECT supplier_id INTO v_fee_supplier_id FROM public.fee_supplier_configs WHERE fee_type = 'boleto' LIMIT 1;
    INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, tenant_id, order_id)
    VALUES ('Taxa Boleto Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.taxa_boleto_percentual::text,'0') || '%)', NEW.taxa_boleto_valor, 'DESPESA', v_competence_date, NULL, v_doc_number || '/TX-BOLETO', v_fee_supplier_id, 'supplier', 'ABERTO', 'Taxa boleto', NEW.vendedor_id, v_cost_center_id, NULL, v_first_ledger_id, NEW.tenant_id, NEW.id) RETURNING id INTO v_expense_ledger_id;
    INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, tenant_id, order_id)
    VALUES (v_fee_supplier_id, NEW.taxa_boleto_valor, v_first_due_date, v_competence_date, 'Taxa Boleto Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text), v_doc_number || '/TX-BOLETO', v_expense_ledger_id, 'ABERTO', v_cost_center_id, 'Taxa de boleto', NEW.tenant_id, NEW.id);
  END IF;

  IF NEW.taxa_link_valor IS NOT NULL AND NEW.taxa_link_valor > 0 AND NEW.taxa_link_responsavel = 'tendenci' THEN
    SELECT supplier_id INTO v_fee_supplier_id FROM public.fee_supplier_configs WHERE fee_type = 'link' LIMIT 1;
    INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id, tenant_id, order_id)
    VALUES ('Taxa Link Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text) || ' (' || COALESCE(NEW.taxa_link_percentual::text,'0') || '%)', NEW.taxa_link_valor, 'DESPESA', v_competence_date, NULL, v_doc_number || '/TX-LINK', v_fee_supplier_id, 'supplier', 'ABERTO', 'Taxa link', NEW.vendedor_id, v_cost_center_id, NULL, v_first_ledger_id, NEW.tenant_id, NEW.id) RETURNING id INTO v_expense_ledger_id;
    INSERT INTO public.fin_payables (supplier_id, amount, due_date, competence_date, description, document_number, ledger_entry_id, status, cost_center_id, notes, tenant_id, order_id)
    VALUES (v_fee_supplier_id, NEW.taxa_link_valor, v_first_due_date, v_competence_date, 'Taxa Link Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text), v_doc_number || '/TX-LINK', v_expense_ledger_id, 'ABERTO', v_cost_center_id, 'Taxa de link', NEW.tenant_id, NEW.id);
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Strategic commitment trigger: friendly doc + cleanup by (order_id, chart_account_id, origem)
CREATE OR REPLACE FUNCTION public.sync_strategic_commitment_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_order RECORD;
  v_cost_center_id uuid;
  v_centro_custo_name text;
  v_account_name text;
  v_account_code text;
  v_doc text;
  v_ledger_id uuid;
  v_cfg_cc_id uuid;
  v_due date;
  v_supplier_id uuid;
  v_selected boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.fin_payables
      WHERE order_id = OLD.order_id
        AND chart_account_id = OLD.chart_account_id
        AND origem = 'order_strategic_commitment'
        AND COALESCE(status,'ABERTO') IN ('ABERTO','VENCIDO');
    DELETE FROM public.fin_ledger_entries
      WHERE order_id = OLD.order_id
        AND chart_account_id = OLD.chart_account_id
        AND origem = 'order_strategic_commitment'
        AND status IN ('ABERTO','PROVISIONADO');
    RETURN OLD;
  END IF;

  SELECT o.id, o.status, o.order_number, o.data_emissao, o.project_id, o.client_id, o.centro_custo, o.tenant_id,
         o.comissao_vendedor_responsavel_id, o.comissao_orcamentista_responsavel_id,
         o.comissao_projetista_responsavel_id, o.comissao_montador_responsavel_id,
         o.comissao_producao_responsavel_id, o.architect_id
    INTO v_order FROM public.orders o WHERE o.id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT name, code INTO v_account_name, v_account_code FROM public.fin_chart_accounts WHERE id = NEW.chart_account_id;
  v_doc := 'PED-' || v_order.order_number || '/' || COALESCE(v_account_code, 'CMP');

  v_selected := COALESCE(NEW.habilitado, false)
                AND COALESCE(NEW.valor, 0) > 0
                AND NEW.responsavel_id IS NOT NULL;

  IF NOT v_selected THEN
    DELETE FROM public.fin_payables
      WHERE order_id = NEW.order_id
        AND chart_account_id = NEW.chart_account_id
        AND origem = 'order_strategic_commitment'
        AND COALESCE(status,'ABERTO') IN ('ABERTO','VENCIDO');
    DELETE FROM public.fin_ledger_entries
      WHERE order_id = NEW.order_id
        AND chart_account_id = NEW.chart_account_id
        AND origem = 'order_strategic_commitment'
        AND status IN ('ABERTO','PROVISIONADO');
    RETURN NEW;
  END IF;

  IF v_order.status::text NOT IN ('ativo','aprovado','faturado','em_producao') THEN
    RETURN NEW;
  END IF;

  SELECT oi.centro_custo INTO v_centro_custo_name
    FROM public.order_items oi WHERE oi.order_id = v_order.id LIMIT 1;
  IF v_centro_custo_name IS NULL THEN v_centro_custo_name := v_order.centro_custo; END IF;
  IF v_centro_custo_name IS NOT NULL THEN
    SELECT id INTO v_cost_center_id FROM public.fin_cost_centers
    WHERE tenant_id = NEW.tenant_id
      AND (LOWER(name) = LOWER(v_centro_custo_name)
        OR LOWER(name) = LOWER(CASE v_centro_custo_name
            WHEN 'moveis_planejados' THEN 'Planejados'
            WHEN 'producao_tendenci' THEN 'Produção Tendenci'
            WHEN 'revenda' THEN 'Revenda'
            ELSE v_centro_custo_name END))
    LIMIT 1;
  END IF;

  IF NEW.responsavel_id IS NOT NULL THEN
    SELECT supplier_id INTO v_supplier_id FROM public.order_responsibles WHERE id = NEW.responsavel_id;
  END IF;
  IF v_supplier_id IS NULL THEN
    SELECT orr.supplier_id INTO v_supplier_id
      FROM public.order_responsibles orr
     WHERE orr.chart_account_id = NEW.chart_account_id
       AND orr.tenant_id = NEW.tenant_id
       AND orr.supplier_id IS NOT NULL
       AND orr.id = ANY (ARRAY[
         v_order.comissao_vendedor_responsavel_id,
         v_order.comissao_orcamentista_responsavel_id,
         v_order.comissao_projetista_responsavel_id,
         v_order.comissao_montador_responsavel_id,
         v_order.comissao_producao_responsavel_id,
         v_order.architect_id
       ]::uuid[])
     LIMIT 1;
  END IF;

  SELECT cost_center_id INTO v_cfg_cc_id
    FROM public.fin_strategic_resource_account_configs
   WHERE tenant_id = NEW.tenant_id AND chart_account_id = NEW.chart_account_id LIMIT 1;
  IF v_cfg_cc_id IS NULL THEN
    SELECT id INTO v_cfg_cc_id FROM public.fin_cost_centers
      WHERE tenant_id = NEW.tenant_id AND LOWER(name)='comercial' AND active=true LIMIT 1;
  END IF;

  IF EXISTS (SELECT 1 FROM public.fin_ledger_entries WHERE order_id = NEW.order_id AND chart_account_id = NEW.chart_account_id AND origem = 'order_strategic_commitment') THEN
    UPDATE public.fin_ledger_entries
    SET amount = NEW.valor,
        description = 'PED #' || v_order.order_number || ' - ' || COALESCE(v_account_name, 'Compromisso'),
        document_number = v_doc,
        cost_center_id = v_cost_center_id,
        project_id = v_order.project_id,
        client_id = v_order.client_id,
        competence_date = COALESCE(v_order.data_emissao::date, NOW()::date),
        updated_at = now()
    WHERE order_id = NEW.order_id AND chart_account_id = NEW.chart_account_id AND origem = 'order_strategic_commitment' AND status IN ('ABERTO','PROVISIONADO')
    RETURNING id INTO v_ledger_id;
  ELSE
    INSERT INTO public.fin_ledger_entries (
      description, amount, type, competence_date, cash_date, status,
      cost_center_id, project_id, chart_account_id, tenant_id,
      order_id, client_id, document_number, origem
    ) VALUES (
      'PED #' || v_order.order_number || ' - ' || COALESCE(v_account_name, 'Compromisso'),
      NEW.valor, 'DESPESA',
      COALESCE(v_order.data_emissao::date, NOW()::date), NULL, 'ABERTO',
      v_cost_center_id, v_order.project_id, NEW.chart_account_id, NEW.tenant_id,
      v_order.id, v_order.client_id, v_doc, 'order_strategic_commitment'
    ) RETURNING id INTO v_ledger_id;
  END IF;

  v_due := COALESCE(v_order.data_emissao::date, NOW()::date) + INTERVAL '30 days';

  IF EXISTS (SELECT 1 FROM public.fin_payables WHERE order_id = NEW.order_id AND chart_account_id = NEW.chart_account_id AND origem = 'order_strategic_commitment') THEN
    UPDATE public.fin_payables
    SET amount = NEW.valor,
        description = 'PED #' || v_order.order_number || ' - ' || COALESCE(v_account_name, 'Compromisso'),
        document_number = v_doc,
        cost_center_id = v_cost_center_id,
        project_id = v_order.project_id,
        supplier_id = v_supplier_id,
        due_date = v_due,
        competence_date = COALESCE(v_order.data_emissao::date, NOW()::date),
        updated_at = now()
    WHERE order_id = NEW.order_id AND chart_account_id = NEW.chart_account_id AND origem = 'order_strategic_commitment'
      AND COALESCE(status,'ABERTO') IN ('ABERTO','VENCIDO');
  ELSE
    INSERT INTO public.fin_payables (
      description, amount, due_date, competence_date, status,
      cost_center_id, project_id, chart_account_id, tenant_id,
      supplier_id, order_id, document_number, origem
    ) VALUES (
      'PED #' || v_order.order_number || ' - ' || COALESCE(v_account_name, 'Compromisso'),
      NEW.valor, v_due, COALESCE(v_order.data_emissao::date, NOW()::date), 'ABERTO',
      v_cost_center_id, v_order.project_id, NEW.chart_account_id, NEW.tenant_id,
      v_supplier_id, v_order.id, v_doc, 'order_strategic_commitment'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Backfill existing records to use friendly document numbers

-- Orders: PED-<uuid>  ->  PED-<order_number>
UPDATE public.fin_ledger_entries le
SET document_number = 'PED-' || o.order_number
FROM public.orders o
WHERE le.order_id = o.id
  AND le.document_number LIKE 'PED-%-%-%-%-%'
  AND COALESCE(le.origem,'') <> 'order_strategic_commitment';

UPDATE public.fin_receivables r
SET document_number = 'PED-' || o.order_number
FROM public.orders o
WHERE r.order_id = o.id
  AND r.document_number LIKE 'PED-%-%-%-%-%';

UPDATE public.fin_payables p
SET document_number = 'PED-' || o.order_number || '/TX'
FROM public.orders o
WHERE p.order_id = o.id
  AND p.document_number LIKE 'PED-%-%-%-%-%'
  AND COALESCE(p.origem,'') <> 'order_strategic_commitment';

-- Strategic commitments: COMP-<uuid>  ->  PED-<order_number>/<account_code>
UPDATE public.fin_ledger_entries le
SET document_number = 'PED-' || o.order_number || '/' || COALESCE(ca.code, 'CMP')
FROM public.orders o, public.fin_chart_accounts ca
WHERE le.order_id = o.id
  AND le.chart_account_id = ca.id
  AND le.origem = 'order_strategic_commitment'
  AND le.document_number LIKE 'COMP-%';

UPDATE public.fin_payables p
SET document_number = 'PED-' || o.order_number || '/' || COALESCE(ca.code, 'CMP')
FROM public.orders o, public.fin_chart_accounts ca
WHERE p.order_id = o.id
  AND p.chart_account_id = ca.id
  AND p.origem = 'order_strategic_commitment'
  AND p.document_number LIKE 'COMP-%';
