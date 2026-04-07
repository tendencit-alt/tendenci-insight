
CREATE OR REPLACE FUNCTION public.update_financial_entries_on_order_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_rt_supplier_id uuid;
  v_arch_name text;
  v_arch_email text;
  v_arch_phone text;
  v_arch_city text;
  v_arch_company text;
  v_cc_group RECORD;
  v_total_items_value numeric;
  v_proportion numeric;
  v_proportional_amount numeric;
  v_has_cc_groups boolean := false;
  v_cc_display_name text;
  v_strategic_chart_account_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('ativo', 'faturado', 'em_producao') THEN
      RETURN NEW;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NOT (
      (NEW.status IN ('ativo', 'faturado', 'em_producao') AND OLD.status IN ('ativo', 'faturado', 'em_producao'))
      OR (NEW.status IN ('ativo', 'faturado', 'em_producao') AND OLD.status IN ('rascunho'))
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Delete old entries on update
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM public.fin_payables WHERE ledger_entry_id IN (
      SELECT id FROM public.fin_ledger_entries
      WHERE document_number = 'PED-' || OLD.id::text
    );
    DELETE FROM public.fin_receivables WHERE ledger_entry_id IN (
      SELECT id FROM public.fin_ledger_entries
      WHERE document_number = 'PED-' || OLD.id::text
    );
    DELETE FROM public.fin_ledger_entries
    WHERE document_number = 'PED-' || OLD.id::text;
  END IF;

  v_competence_date := COALESCE(NEW.data_emissao::date, NOW()::date);
  v_doc_number := 'PED-' || NEW.id::text;

  -- Find cost center
  SELECT id INTO v_cost_center_id
  FROM public.fin_cost_centers
  WHERE name ILIKE '%' || COALESCE(NEW.centro_custo, '') || '%'
  LIMIT 1;

  -- Find responsible name
  SELECT full_name INTO v_responsible_name
  FROM public.profiles
  WHERE id = NEW.responsavel_id;

  -- Resolve chart_account_id from order with fallback to '1.1'
  v_chart_account_id := COALESCE(
    NEW.chart_account_id,
    (SELECT id FROM public.fin_chart_accounts WHERE code = '1.1' LIMIT 1)
  );

  -- ==========================================
  -- Check for cost center groups in order items
  -- ==========================================
  SELECT EXISTS (
    SELECT 1 FROM public.order_items
    WHERE order_id = NEW.id AND centro_custo IS NOT NULL AND centro_custo != ''
  ) INTO v_has_cc_groups;

  IF v_has_cc_groups THEN
    SELECT COALESCE(SUM(valor_total), 0) INTO v_total_items_value
    FROM public.order_items WHERE order_id = NEW.id;
  END IF;

  -- ==========================================
  -- 1. REVENUE ENTRY (Receita do pedido)
  -- ==========================================
  IF v_has_cc_groups THEN
    v_first_ledger_id := NULL;
    FOR v_cc_group IN
      SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value
      FROM public.order_items oi
      LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%'
      WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != ''
      GROUP BY oi.centro_custo, cc.id, cc.name
    LOOP
      IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
      v_proportional_amount := NEW.valor_total * v_proportion;
      v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);

      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id, chart_account_id
      ) VALUES (
        'Receita Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' - ' || COALESCE(NEW.client_name, '') || ' [CC: ' || v_cc_display_name || ']',
        v_proportional_amount, 'RECEITA', v_competence_date, NULL,
        v_doc_number, NEW.client_id, 'client', 'ABERTO',
        'Pedido: ' || COALESCE(NEW.numero_pedido::text, '') || ' | Resp: ' || COALESCE(v_responsible_name, '') || ' | CC: ' || v_cc_display_name,
        NEW.responsavel_id,
        v_cc_group.cc_id, NULL, v_first_ledger_id, v_chart_account_id
      ) RETURNING id INTO v_ledger_id;

      IF v_first_ledger_id IS NULL THEN v_first_ledger_id := v_ledger_id; END IF;

      INSERT INTO public.fin_receivables (
        customer_id, amount, due_date, competence_date, description,
        document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id
      ) VALUES (
        NEW.client_id, v_proportional_amount, v_competence_date, v_competence_date,
        'Receita Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']',
        v_doc_number, v_ledger_id, 'ABERTO', v_cc_group.cc_id,
        'Gerado automaticamente via pedido', v_chart_account_id
      );
    END LOOP;
  ELSE
    INSERT INTO public.fin_ledger_entries (
      description, amount, type, competence_date, cash_date,
      document_number, party_id, party_type, status, notes, created_by,
      cost_center_id, project_id, payment_method, chart_account_id
    ) VALUES (
      'Receita Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' - ' || COALESCE(NEW.client_name, ''),
      NEW.valor_total, 'RECEITA', v_competence_date, NULL,
      v_doc_number, NEW.client_id, 'client', 'ABERTO',
      'Pedido: ' || COALESCE(NEW.numero_pedido::text, '') || ' | Resp: ' || COALESCE(v_responsible_name, ''),
      NEW.responsavel_id,
      v_cost_center_id, NULL, NULL, v_chart_account_id
    ) RETURNING id INTO v_first_ledger_id;

    INSERT INTO public.fin_receivables (
      customer_id, amount, due_date, competence_date, description,
      document_number, ledger_entry_id, status, cost_center_id, notes, chart_account_id
    ) VALUES (
      NEW.client_id, NEW.valor_total, v_competence_date, v_competence_date,
      'Receita Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' - ' || COALESCE(NEW.client_name, ''),
      v_doc_number, v_first_ledger_id, 'ABERTO', v_cost_center_id,
      'Gerado automaticamente via pedido', v_chart_account_id
    );
  END IF;

  -- ==========================================
  -- 2. Production Cost (Custo de Produção)
  -- ==========================================
  IF NEW.custo_total IS NOT NULL AND NEW.custo_total > 0 THEN
    IF v_has_cc_groups THEN
      FOR v_cc_group IN
        SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value
        FROM public.order_items oi
        LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%'
        WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != ''
        GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.custo_total * v_proportion;
        v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);

        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, cash_date, document_number,
          party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id, chart_account_id
        ) VALUES (
          'Custo Produção Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']',
          v_proportional_amount, 'DESPESA', v_competence_date, NULL,
          v_doc_number, NULL, NULL, 'ABERTO',
          'Custo de produção | CC: ' || v_cc_display_name,
          NEW.responsavel_id,
          v_cc_group.cc_id, NULL, v_first_ledger_id, NULL
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          supplier_id, amount, due_date, competence_date, description,
          document_number, ledger_entry_id, status, cost_center_id, notes
        ) VALUES (
          NULL, v_proportional_amount, v_competence_date, v_competence_date,
          'Custo Produção Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']',
          v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id,
          'Gerado automaticamente via pedido'
        );
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date,
        document_number, party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id, chart_account_id
      ) VALUES (
        'Custo Produção Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' - ' || COALESCE(NEW.client_name, ''),
        NEW.custo_total, 'DESPESA', v_competence_date, NULL,
        v_doc_number, NULL, NULL, 'ABERTO',
        'Custo de produção do pedido',
        NEW.responsavel_id,
        v_cost_center_id, NULL, v_first_ledger_id, NULL
      ) RETURNING id INTO v_expense_ledger_id;

      INSERT INTO public.fin_payables (
        supplier_id, amount, due_date, competence_date, description,
        document_number, ledger_entry_id, status, cost_center_id, notes
      ) VALUES (
        NULL, NEW.custo_total, v_competence_date, v_competence_date,
        'Custo Produção Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text),
        v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id,
        'Gerado automaticamente via pedido'
      );
    END IF;
  END IF;

  -- ==========================================
  -- 3. Credit Card Fee (Taxa Cartão)
  -- ==========================================
  IF NEW.taxa_cartao_valor IS NOT NULL AND NEW.taxa_cartao_valor > 0 AND NEW.taxa_cartao_responsavel = 'tendenci' THEN
    SELECT id INTO v_fee_supplier_id FROM public.fee_supplier_configs WHERE fee_type = 'cartao' LIMIT 1;

    IF v_has_cc_groups THEN
      FOR v_cc_group IN
        SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value
        FROM public.order_items oi
        LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%'
        WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != ''
        GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.taxa_cartao_valor * v_proportion;
        v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);

        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, cash_date,
          document_number, party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id
        ) VALUES (
          'Taxa Cartão Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' (' || COALESCE(NEW.taxa_cartao_percentual::text, '0') || '%) [CC: ' || v_cc_display_name || ']',
          v_proportional_amount, 'DESPESA', v_competence_date, NULL,
          v_doc_number, v_fee_supplier_id, 'supplier', 'ABERTO',
          'Taxa de cartão de crédito - ' || COALESCE(NEW.numero_parcelas_cartao::text, '1') || 'x | CC: ' || v_cc_display_name,
          NEW.responsavel_id,
          v_cc_group.cc_id, NULL, v_first_ledger_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          supplier_id, amount, due_date, competence_date, description,
          document_number, ledger_entry_id, status, cost_center_id, notes
        ) VALUES (
          v_fee_supplier_id, v_proportional_amount, v_competence_date, v_competence_date,
          'Taxa Cartão Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']',
          v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id,
          'Taxa de cartão de crédito'
        );
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date,
        document_number, party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'Taxa Cartão Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' (' || COALESCE(NEW.taxa_cartao_percentual::text, '0') || '%)',
        NEW.taxa_cartao_valor, 'DESPESA', v_competence_date, NULL,
        v_doc_number, v_fee_supplier_id, 'supplier', 'ABERTO',
        'Taxa de cartão de crédito - ' || COALESCE(NEW.numero_parcelas_cartao::text, '1') || 'x',
        NEW.responsavel_id,
        v_cost_center_id, NULL, v_first_ledger_id
      ) RETURNING id INTO v_expense_ledger_id;

      INSERT INTO public.fin_payables (
        supplier_id, amount, due_date, competence_date, description,
        document_number, ledger_entry_id, status, cost_center_id, notes
      ) VALUES (
        v_fee_supplier_id, NEW.taxa_cartao_valor, v_competence_date, v_competence_date,
        'Taxa Cartão Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text),
        v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id,
        'Taxa de cartão de crédito'
      );
    END IF;
  END IF;

  -- ==========================================
  -- 4. Boleto Fee (Taxa Boleto)
  -- ==========================================
  IF NEW.taxa_boleto_valor IS NOT NULL AND NEW.taxa_boleto_valor > 0 AND NEW.taxa_boleto_responsavel = 'tendenci' THEN
    SELECT id INTO v_fee_supplier_id FROM public.fee_supplier_configs WHERE fee_type = 'boleto' LIMIT 1;

    IF v_has_cc_groups THEN
      FOR v_cc_group IN
        SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value
        FROM public.order_items oi
        LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%'
        WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != ''
        GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.taxa_boleto_valor * v_proportion;
        v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);

        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, cash_date,
          document_number, party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id
        ) VALUES (
          'Taxa Boleto Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' (' || COALESCE(NEW.taxa_boleto_percentual::text, '0') || '%) [CC: ' || v_cc_display_name || ']',
          v_proportional_amount, 'DESPESA', v_competence_date, NULL,
          v_doc_number, v_fee_supplier_id, 'supplier', 'ABERTO',
          'Taxa de boleto - ' || COALESCE(NEW.numero_parcelas_boleto::text, '1') || 'x | CC: ' || v_cc_display_name,
          NEW.responsavel_id,
          v_cc_group.cc_id, NULL, v_first_ledger_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          supplier_id, amount, due_date, competence_date, description,
          document_number, ledger_entry_id, status, cost_center_id, notes
        ) VALUES (
          v_fee_supplier_id, v_proportional_amount, v_competence_date, v_competence_date,
          'Taxa Boleto Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']',
          v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id,
          'Taxa de boleto'
        );
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date,
        document_number, party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'Taxa Boleto Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' (' || COALESCE(NEW.taxa_boleto_percentual::text, '0') || '%)',
        NEW.taxa_boleto_valor, 'DESPESA', v_competence_date, NULL,
        v_doc_number, v_fee_supplier_id, 'supplier', 'ABERTO',
        'Taxa de boleto - ' || COALESCE(NEW.numero_parcelas_boleto::text, '1') || 'x',
        NEW.responsavel_id,
        v_cost_center_id, NULL, v_first_ledger_id
      ) RETURNING id INTO v_expense_ledger_id;

      INSERT INTO public.fin_payables (
        supplier_id, amount, due_date, competence_date, description,
        document_number, ledger_entry_id, status, cost_center_id, notes
      ) VALUES (
        v_fee_supplier_id, NEW.taxa_boleto_valor, v_competence_date, v_competence_date,
        'Taxa Boleto Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text),
        v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id,
        'Taxa de boleto'
      );
    END IF;
  END IF;

  -- ==========================================
  -- 5. Payment Link Fee (Taxa Link Pagamento)
  -- ==========================================
  IF NEW.taxa_link_valor IS NOT NULL AND NEW.taxa_link_valor > 0 AND NEW.taxa_link_responsavel = 'tendenci' THEN
    SELECT id INTO v_fee_supplier_id FROM public.fee_supplier_configs WHERE fee_type = 'link' LIMIT 1;

    IF v_has_cc_groups THEN
      FOR v_cc_group IN
        SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value
        FROM public.order_items oi
        LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%'
        WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != ''
        GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.taxa_link_valor * v_proportion;
        v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);

        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, cash_date,
          document_number, party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id
        ) VALUES (
          'Taxa Link Pagamento Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' (' || COALESCE(NEW.taxa_link_percentual::text, '0') || '%) [CC: ' || v_cc_display_name || ']',
          v_proportional_amount, 'DESPESA', v_competence_date, NULL,
          v_doc_number, v_fee_supplier_id, 'supplier', 'ABERTO',
          'Taxa de link de pagamento - ' || COALESCE(NEW.numero_parcelas_link::text, '1') || 'x | CC: ' || v_cc_display_name,
          NEW.responsavel_id,
          v_cc_group.cc_id, NULL, v_first_ledger_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          supplier_id, amount, due_date, competence_date, description,
          document_number, ledger_entry_id, status, cost_center_id, notes
        ) VALUES (
          v_fee_supplier_id, v_proportional_amount, v_competence_date, v_competence_date,
          'Taxa Link Pagamento Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']',
          v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id,
          'Taxa de link de pagamento'
        );
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date,
        document_number, party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'Taxa Link Pagamento Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' (' || COALESCE(NEW.taxa_link_percentual::text, '0') || '%)',
        NEW.taxa_link_valor, 'DESPESA', v_competence_date, NULL,
        v_doc_number, v_fee_supplier_id, 'supplier', 'ABERTO',
        'Taxa de link de pagamento - ' || COALESCE(NEW.numero_parcelas_link::text, '1') || 'x',
        NEW.responsavel_id,
        v_cost_center_id, NULL, v_first_ledger_id
      ) RETURNING id INTO v_expense_ledger_id;

      INSERT INTO public.fin_payables (
        supplier_id, amount, due_date, competence_date, description,
        document_number, ledger_entry_id, status, cost_center_id, notes
      ) VALUES (
        v_fee_supplier_id, NEW.taxa_link_valor, v_competence_date, v_competence_date,
        'Taxa Link Pagamento Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text),
        v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id,
        'Taxa de link de pagamento'
      );
    END IF;
  END IF;

  -- ==========================================
  -- 6. RT Commission
  -- ==========================================
  IF NEW.rt_habilitado = true AND NEW.rt_valor IS NOT NULL AND NEW.rt_valor > 0 THEN
    SELECT name, email, phone, city, company INTO v_arch_name, v_arch_email, v_arch_phone, v_arch_city, v_arch_company
    FROM public.architects WHERE id = NEW.architect_id;

    SELECT id INTO v_rt_supplier_id FROM public.suppliers
    WHERE name = v_arch_name AND supplier_type = 'arquiteto' LIMIT 1;

    IF v_rt_supplier_id IS NULL THEN
      INSERT INTO public.suppliers (name, email, phone, city, company, supplier_type, notes)
      VALUES (v_arch_name, v_arch_email, v_arch_phone, v_arch_city, v_arch_company, 'arquiteto',
        'Criado automaticamente a partir do pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text))
      RETURNING id INTO v_rt_supplier_id;
    END IF;

    IF v_has_cc_groups THEN
      FOR v_cc_group IN
        SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value
        FROM public.order_items oi
        LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%'
        WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != ''
        GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.rt_valor * v_proportion;
        v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);

        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, cash_date,
          document_number, party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id
        ) VALUES (
          'Comissão RT Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' - ' || COALESCE(v_arch_name, '') || ' (' || COALESCE(NEW.rt_percentual::text, '0') || '%) [CC: ' || v_cc_display_name || ']',
          v_proportional_amount, 'DESPESA', v_competence_date, NULL,
          v_doc_number, v_rt_supplier_id, 'supplier', 'ABERTO',
          'Comissão RT para arquiteto ' || COALESCE(v_arch_name, '') || ' | CC: ' || v_cc_display_name,
          NEW.responsavel_id,
          v_cc_group.cc_id, NULL, v_first_ledger_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          supplier_id, amount, due_date, competence_date, description,
          document_number, ledger_entry_id, status, cost_center_id, notes
        ) VALUES (
          v_rt_supplier_id, v_proportional_amount, v_competence_date, v_competence_date,
          'Comissão RT Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' - ' || COALESCE(v_arch_name, '') || ' [CC: ' || v_cc_display_name || ']',
          v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id,
          'Comissão RT para arquiteto'
        );
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date,
        document_number, party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'Comissão RT Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' - ' || COALESCE(v_arch_name, '') || ' (' || COALESCE(NEW.rt_percentual::text, '0') || '%)',
        NEW.rt_valor, 'DESPESA', v_competence_date, NULL,
        v_doc_number, v_rt_supplier_id, 'supplier', 'ABERTO',
        'Comissão RT para arquiteto ' || COALESCE(v_arch_name, ''),
        NEW.responsavel_id,
        v_cost_center_id, NULL, v_first_ledger_id
      ) RETURNING id INTO v_expense_ledger_id;

      INSERT INTO public.fin_payables (
        supplier_id, amount, due_date, competence_date, description,
        document_number, ledger_entry_id, status, cost_center_id, notes
      ) VALUES (
        v_rt_supplier_id, NEW.rt_valor, v_competence_date, v_competence_date,
        'Comissão RT Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' - ' || COALESCE(v_arch_name, ''),
        v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id,
        'Comissão RT para arquiteto'
      );
    END IF;
  END IF;

  -- ==========================================
  -- 7. Vendedor Commission
  -- ==========================================
  IF NEW.comissao_vendedor_valor IS NOT NULL AND NEW.comissao_vendedor_valor > 0 THEN
    SELECT id INTO v_supplier_id FROM public.suppliers
    WHERE profile_id = NEW.comissao_vendedor_responsavel_id AND supplier_type = 'vendedor' LIMIT 1;

    IF v_supplier_id IS NULL AND NEW.comissao_vendedor_responsavel_id IS NOT NULL THEN
      SELECT full_name INTO v_responsible_name FROM public.profiles WHERE id = NEW.comissao_vendedor_responsavel_id;
      INSERT INTO public.suppliers (name, supplier_type, profile_id, notes)
      VALUES (COALESCE(v_responsible_name, 'Vendedor'), 'vendedor', NEW.comissao_vendedor_responsavel_id,
        'Criado automaticamente a partir do pedido')
      RETURNING id INTO v_supplier_id;
    END IF;

    IF v_has_cc_groups THEN
      FOR v_cc_group IN
        SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value
        FROM public.order_items oi
        LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%'
        WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != ''
        GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.comissao_vendedor_valor * v_proportion;
        v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);

        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, cash_date,
          document_number, party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id
        ) VALUES (
          'Comissão Vendedor Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_vendedor_percentual::text, '0') || '%) [CC: ' || v_cc_display_name || ']',
          v_proportional_amount, 'DESPESA', v_competence_date, NULL,
          v_doc_number, v_supplier_id, 'supplier', 'ABERTO',
          'Comissão do vendedor | CC: ' || v_cc_display_name,
          NEW.responsavel_id,
          v_cc_group.cc_id, NULL, v_first_ledger_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          supplier_id, amount, due_date, competence_date, description,
          document_number, ledger_entry_id, status, cost_center_id, notes
        ) VALUES (
          v_supplier_id, v_proportional_amount, v_competence_date, v_competence_date,
          'Comissão Vendedor Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']',
          v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id,
          'Comissão do vendedor'
        );
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date,
        document_number, party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'Comissão Vendedor Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_vendedor_percentual::text, '0') || '%)',
        NEW.comissao_vendedor_valor, 'DESPESA', v_competence_date, NULL,
        v_doc_number, v_supplier_id, 'supplier', 'ABERTO',
        'Comissão do vendedor',
        NEW.responsavel_id,
        v_cost_center_id, NULL, v_first_ledger_id
      ) RETURNING id INTO v_expense_ledger_id;

      INSERT INTO public.fin_payables (
        supplier_id, amount, due_date, competence_date, description,
        document_number, ledger_entry_id, status, cost_center_id, notes
      ) VALUES (
        v_supplier_id, NEW.comissao_vendedor_valor, v_competence_date, v_competence_date,
        'Comissão Vendedor Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text),
        v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id,
        'Comissão do vendedor'
      );
    END IF;
  END IF;

  -- ==========================================
  -- 8. Orcamentista Commission
  -- ==========================================
  IF NEW.comissao_orcamentista_valor IS NOT NULL AND NEW.comissao_orcamentista_valor > 0 THEN
    SELECT id INTO v_supplier_id FROM public.suppliers
    WHERE profile_id = NEW.comissao_orcamentista_responsavel_id AND supplier_type = 'orcamentista' LIMIT 1;

    IF v_supplier_id IS NULL AND NEW.comissao_orcamentista_responsavel_id IS NOT NULL THEN
      SELECT full_name INTO v_responsible_name FROM public.profiles WHERE id = NEW.comissao_orcamentista_responsavel_id;
      INSERT INTO public.suppliers (name, supplier_type, profile_id, notes)
      VALUES (COALESCE(v_responsible_name, 'Orçamentista'), 'orcamentista', NEW.comissao_orcamentista_responsavel_id,
        'Criado automaticamente a partir do pedido')
      RETURNING id INTO v_supplier_id;
    END IF;

    IF v_has_cc_groups THEN
      FOR v_cc_group IN
        SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value
        FROM public.order_items oi
        LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%'
        WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != ''
        GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.comissao_orcamentista_valor * v_proportion;
        v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);

        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, cash_date,
          document_number, party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id
        ) VALUES (
          'Comissão Orçamentista Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_orcamentista_percentual::text, '0') || '%) [CC: ' || v_cc_display_name || ']',
          v_proportional_amount, 'DESPESA', v_competence_date, NULL,
          v_doc_number, v_supplier_id, 'supplier', 'ABERTO',
          'Comissão do orçamentista | CC: ' || v_cc_display_name,
          NEW.responsavel_id,
          v_cc_group.cc_id, NULL, v_first_ledger_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          supplier_id, amount, due_date, competence_date, description,
          document_number, ledger_entry_id, status, cost_center_id, notes
        ) VALUES (
          v_supplier_id, v_proportional_amount, v_competence_date, v_competence_date,
          'Comissão Orçamentista Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']',
          v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id,
          'Comissão do orçamentista'
        );
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date,
        document_number, party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'Comissão Orçamentista Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_orcamentista_percentual::text, '0') || '%)',
        NEW.comissao_orcamentista_valor, 'DESPESA', v_competence_date, NULL,
        v_doc_number, v_supplier_id, 'supplier', 'ABERTO',
        'Comissão do orçamentista',
        NEW.responsavel_id,
        v_cost_center_id, NULL, v_first_ledger_id
      ) RETURNING id INTO v_expense_ledger_id;

      INSERT INTO public.fin_payables (
        supplier_id, amount, due_date, competence_date, description,
        document_number, ledger_entry_id, status, cost_center_id, notes
      ) VALUES (
        v_supplier_id, NEW.comissao_orcamentista_valor, v_competence_date, v_competence_date,
        'Comissão Orçamentista Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text),
        v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id,
        'Comissão do orçamentista'
      );
    END IF;
  END IF;

  -- ==========================================
  -- 9. Projetista Commission
  -- ==========================================
  IF NEW.comissao_projetista_valor IS NOT NULL AND NEW.comissao_projetista_valor > 0 THEN
    SELECT id INTO v_supplier_id FROM public.suppliers
    WHERE profile_id = NEW.comissao_projetista_responsavel_id AND supplier_type = 'projetista' LIMIT 1;

    IF v_supplier_id IS NULL AND NEW.comissao_projetista_responsavel_id IS NOT NULL THEN
      SELECT full_name INTO v_responsible_name FROM public.profiles WHERE id = NEW.comissao_projetista_responsavel_id;
      INSERT INTO public.suppliers (name, supplier_type, profile_id, notes)
      VALUES (COALESCE(v_responsible_name, 'Projetista'), 'projetista', NEW.comissao_projetista_responsavel_id,
        'Criado automaticamente a partir do pedido')
      RETURNING id INTO v_supplier_id;
    END IF;

    IF v_has_cc_groups THEN
      FOR v_cc_group IN
        SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value
        FROM public.order_items oi
        LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%'
        WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != ''
        GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.comissao_projetista_valor * v_proportion;
        v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);

        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, cash_date,
          document_number, party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id
        ) VALUES (
          'Comissão Projetista Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_projetista_percentual::text, '0') || '%) [CC: ' || v_cc_display_name || ']',
          v_proportional_amount, 'DESPESA', v_competence_date, NULL,
          v_doc_number, v_supplier_id, 'supplier', 'ABERTO',
          'Comissão do projetista | CC: ' || v_cc_display_name,
          NEW.responsavel_id,
          v_cc_group.cc_id, NULL, v_first_ledger_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          supplier_id, amount, due_date, competence_date, description,
          document_number, ledger_entry_id, status, cost_center_id, notes
        ) VALUES (
          v_supplier_id, v_proportional_amount, v_competence_date, v_competence_date,
          'Comissão Projetista Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']',
          v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id,
          'Comissão do projetista'
        );
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date,
        document_number, party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'Comissão Projetista Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_projetista_percentual::text, '0') || '%)',
        NEW.comissao_projetista_valor, 'DESPESA', v_competence_date, NULL,
        v_doc_number, v_supplier_id, 'supplier', 'ABERTO',
        'Comissão do projetista',
        NEW.responsavel_id,
        v_cost_center_id, NULL, v_first_ledger_id
      ) RETURNING id INTO v_expense_ledger_id;

      INSERT INTO public.fin_payables (
        supplier_id, amount, due_date, competence_date, description,
        document_number, ledger_entry_id, status, cost_center_id, notes
      ) VALUES (
        v_supplier_id, NEW.comissao_projetista_valor, v_competence_date, v_competence_date,
        'Comissão Projetista Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text),
        v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id,
        'Comissão do projetista'
      );
    END IF;
  END IF;

  -- ==========================================
  -- 10. Montador Commission
  -- ==========================================
  IF NEW.comissao_montador_valor IS NOT NULL AND NEW.comissao_montador_valor > 0 THEN
    SELECT id INTO v_supplier_id FROM public.suppliers
    WHERE profile_id = NEW.comissao_montador_responsavel_id AND supplier_type = 'montador' LIMIT 1;

    IF v_supplier_id IS NULL AND NEW.comissao_montador_responsavel_id IS NOT NULL THEN
      SELECT full_name INTO v_responsible_name FROM public.profiles WHERE id = NEW.comissao_montador_responsavel_id;
      INSERT INTO public.suppliers (name, supplier_type, profile_id, notes)
      VALUES (COALESCE(v_responsible_name, 'Montador'), 'montador', NEW.comissao_montador_responsavel_id,
        'Criado automaticamente a partir do pedido')
      RETURNING id INTO v_supplier_id;
    END IF;

    IF v_has_cc_groups THEN
      FOR v_cc_group IN
        SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value
        FROM public.order_items oi
        LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%'
        WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != ''
        GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.comissao_montador_valor * v_proportion;
        v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);

        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, cash_date,
          document_number, party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id
        ) VALUES (
          'Comissão Montador Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_montador_percentual::text, '0') || '%) [CC: ' || v_cc_display_name || ']',
          v_proportional_amount, 'DESPESA', v_competence_date, NULL,
          v_doc_number, v_supplier_id, 'supplier', 'ABERTO',
          'Comissão do montador | CC: ' || v_cc_display_name,
          NEW.responsavel_id,
          v_cc_group.cc_id, NULL, v_first_ledger_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          supplier_id, amount, due_date, competence_date, description,
          document_number, ledger_entry_id, status, cost_center_id, notes
        ) VALUES (
          v_supplier_id, v_proportional_amount, v_competence_date, v_competence_date,
          'Comissão Montador Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']',
          v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id,
          'Comissão do montador'
        );
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date,
        document_number, party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'Comissão Montador Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_montador_percentual::text, '0') || '%)',
        NEW.comissao_montador_valor, 'DESPESA', v_competence_date, NULL,
        v_doc_number, v_supplier_id, 'supplier', 'ABERTO',
        'Comissão do montador',
        NEW.responsavel_id,
        v_cost_center_id, NULL, v_first_ledger_id
      ) RETURNING id INTO v_expense_ledger_id;

      INSERT INTO public.fin_payables (
        supplier_id, amount, due_date, competence_date, description,
        document_number, ledger_entry_id, status, cost_center_id, notes
      ) VALUES (
        v_supplier_id, NEW.comissao_montador_valor, v_competence_date, v_competence_date,
        'Comissão Montador Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text),
        v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id,
        'Comissão do montador'
      );
    END IF;
  END IF;

  -- ==========================================
  -- 11. Produção Commission
  -- ==========================================
  IF NEW.comissao_producao_valor IS NOT NULL AND NEW.comissao_producao_valor > 0 THEN
    SELECT id INTO v_supplier_id FROM public.suppliers
    WHERE profile_id = NEW.comissao_producao_responsavel_id AND supplier_type = 'producao' LIMIT 1;

    IF v_supplier_id IS NULL AND NEW.comissao_producao_responsavel_id IS NOT NULL THEN
      SELECT full_name INTO v_responsible_name FROM public.profiles WHERE id = NEW.comissao_producao_responsavel_id;
      INSERT INTO public.suppliers (name, supplier_type, profile_id, notes)
      VALUES (COALESCE(v_responsible_name, 'Produção'), 'producao', NEW.comissao_producao_responsavel_id,
        'Criado automaticamente a partir do pedido')
      RETURNING id INTO v_supplier_id;
    END IF;

    IF v_has_cc_groups THEN
      FOR v_cc_group IN
        SELECT oi.centro_custo, cc.id as cc_id, cc.name as cc_name, SUM(oi.valor_total) as group_value
        FROM public.order_items oi
        LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%'
        WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != ''
        GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN v_proportion := v_cc_group.group_value / v_total_items_value; ELSE v_proportion := 1; END IF;
        v_proportional_amount := NEW.comissao_producao_valor * v_proportion;
        v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);

        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, cash_date,
          document_number, party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id
        ) VALUES (
          'Comissão Produção Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_producao_percentual::text, '0') || '%) [CC: ' || v_cc_display_name || ']',
          v_proportional_amount, 'DESPESA', v_competence_date, NULL,
          v_doc_number, v_supplier_id, 'supplier', 'ABERTO',
          'Comissão de produção | CC: ' || v_cc_display_name,
          NEW.responsavel_id,
          v_cc_group.cc_id, NULL, v_first_ledger_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          supplier_id, amount, due_date, competence_date, description,
          document_number, ledger_entry_id, status, cost_center_id, notes
        ) VALUES (
          v_supplier_id, v_proportional_amount, v_competence_date, v_competence_date,
          'Comissão Produção Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']',
          v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id,
          'Comissão de produção'
        );
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date,
        document_number, party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'Comissão Produção Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' (' || COALESCE(NEW.comissao_producao_percentual::text, '0') || '%)',
        NEW.comissao_producao_valor, 'DESPESA', v_competence_date, NULL,
        v_doc_number, v_supplier_id, 'supplier', 'ABERTO',
        'Comissão de produção',
        NEW.responsavel_id,
        v_cost_center_id, NULL, v_first_ledger_id
      ) RETURNING id INTO v_expense_ledger_id;

      INSERT INTO public.fin_payables (
        supplier_id, amount, due_date, competence_date, description,
        document_number, ledger_entry_id, status, cost_center_id, notes
      ) VALUES (
        v_supplier_id, NEW.comissao_producao_valor, v_competence_date, v_competence_date,
        'Comissão Produção Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text),
        v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id,
        'Comissão de produção'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
