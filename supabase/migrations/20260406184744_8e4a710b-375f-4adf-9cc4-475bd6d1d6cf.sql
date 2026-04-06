
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

  -- ==========================================
  -- REVENUE ENTRY (Receita do pedido)
  -- ==========================================

  -- Check for cost center groups in order items
  SELECT EXISTS (
    SELECT 1 FROM public.order_items
    WHERE order_id = NEW.id AND centro_custo IS NOT NULL AND centro_custo != ''
  ) INTO v_has_cc_groups;

  IF v_has_cc_groups THEN
    -- Get total items value for proportion calculation
    SELECT COALESCE(SUM(valor_total), 0) INTO v_total_items_value
    FROM public.order_items WHERE order_id = NEW.id;

    v_first_ledger_id := NULL;

    FOR v_cc_group IN
      SELECT
        oi.centro_custo,
        cc.id as cc_id,
        cc.name as cc_name,
        SUM(oi.valor_total) as group_value
      FROM public.order_items oi
      LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%'
      WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != ''
      GROUP BY oi.centro_custo, cc.id, cc.name
    LOOP
      IF v_total_items_value > 0 THEN
        v_proportion := v_cc_group.group_value / v_total_items_value;
      ELSE
        v_proportion := 1;
      END IF;
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
        v_cc_group.cc_id, NULL, v_first_ledger_id, NULL
      ) RETURNING id INTO v_ledger_id;

      IF v_first_ledger_id IS NULL THEN
        v_first_ledger_id := v_ledger_id;
      END IF;

      -- Create linked receivable
      INSERT INTO public.fin_receivables (
        customer_id, amount, due_date, competence_date, description,
        document_number, ledger_entry_id, status, cost_center_id, notes
      ) VALUES (
        NEW.client_id, v_proportional_amount, v_competence_date, v_competence_date,
        'Receita Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']',
        v_doc_number, v_ledger_id, 'ABERTO', v_cc_group.cc_id,
        'Gerado automaticamente via pedido'
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
      v_cost_center_id, NULL, NULL, NULL
    ) RETURNING id INTO v_first_ledger_id;

    -- Create linked receivable
    INSERT INTO public.fin_receivables (
      customer_id, amount, due_date, competence_date, description,
      document_number, ledger_entry_id, status, cost_center_id, notes
    ) VALUES (
      NEW.client_id, NEW.valor_total, v_competence_date, v_competence_date,
      'Receita Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' - ' || COALESCE(NEW.client_name, ''),
      v_doc_number, v_first_ledger_id, 'ABERTO', v_cost_center_id,
      'Gerado automaticamente via pedido'
    );
  END IF;

  -- ==========================================
  -- EXPENSE ENTRIES (Custos / Comissões / Taxas)
  -- ==========================================

  -- 1. Production Cost (Custo de Produção)
  IF NEW.custo_total IS NOT NULL AND NEW.custo_total > 0 THEN
    IF v_has_cc_groups THEN
      FOR v_cc_group IN
        SELECT
          oi.centro_custo,
          cc.id as cc_id,
          cc.name as cc_name,
          SUM(oi.valor_total) as group_value
        FROM public.order_items oi
        LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%'
        WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != ''
        GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN
          v_proportion := v_cc_group.group_value / v_total_items_value;
        ELSE
          v_proportion := 1;
        END IF;
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
        description, amount, type, competence_date, cash_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id, chart_account_id
      ) VALUES (
        'Custo Produção Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text),
        NEW.custo_total, 'DESPESA', v_competence_date, NULL,
        v_doc_number, NULL, NULL, 'ABERTO',
        'Custo de produção',
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

  -- 2. Commission (Comissão do Arquiteto)
  IF NEW.comissao_valor IS NOT NULL AND NEW.comissao_valor > 0 THEN
    -- Get architect details
    IF NEW.architect_id IS NOT NULL THEN
      SELECT name, email, phone, city, company INTO v_arch_name, v_arch_email, v_arch_phone, v_arch_city, v_arch_company
      FROM public.architects WHERE id = NEW.architect_id;
    END IF;

    -- Find supplier for commissions
    SELECT id INTO v_supplier_id FROM public.suppliers
    WHERE name ILIKE '%comiss%' OR name ILIKE '%arquitet%' LIMIT 1;

    IF v_has_cc_groups THEN
      FOR v_cc_group IN
        SELECT
          oi.centro_custo,
          cc.id as cc_id,
          cc.name as cc_name,
          SUM(oi.valor_total) as group_value
        FROM public.order_items oi
        LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%'
        WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != ''
        GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN
          v_proportion := v_cc_group.group_value / v_total_items_value;
        ELSE
          v_proportion := 1;
        END IF;
        v_proportional_amount := NEW.comissao_valor * v_proportion;
        v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, cash_date, document_number,
          party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id, chart_account_id
        ) VALUES (
          'Comissão Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' - ' || COALESCE(v_arch_name, 'Arquiteto') || ' [CC: ' || v_cc_display_name || ']',
          v_proportional_amount, 'DESPESA', v_competence_date, NULL,
          v_doc_number, v_supplier_id, 'supplier', 'ABERTO',
          'Comissão: ' || COALESCE(v_arch_name, '') || ' | CC: ' || v_cc_display_name,
          NEW.responsavel_id,
          v_cc_group.cc_id, NULL, v_first_ledger_id, NULL
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          supplier_id, amount, due_date, competence_date, description,
          document_number, ledger_entry_id, status, cost_center_id, notes
        ) VALUES (
          v_supplier_id, v_proportional_amount, v_competence_date, v_competence_date,
          'Comissão Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' - ' || COALESCE(v_arch_name, 'Arquiteto') || ' [CC: ' || v_cc_display_name || ']',
          v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id,
          'Gerado automaticamente via pedido'
        );
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id, chart_account_id
      ) VALUES (
        'Comissão Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' - ' || COALESCE(v_arch_name, 'Arquiteto'),
        NEW.comissao_valor, 'DESPESA', v_competence_date, NULL,
        v_doc_number, v_supplier_id, 'supplier', 'ABERTO',
        'Comissão: ' || COALESCE(v_arch_name, '') || ' | Email: ' || COALESCE(v_arch_email, '') || ' | Tel: ' || COALESCE(v_arch_phone, '') || ' | Cidade: ' || COALESCE(v_arch_city, '') || ' | Empresa: ' || COALESCE(v_arch_company, ''),
        NEW.responsavel_id,
        v_cost_center_id, NULL, v_first_ledger_id, NULL
      ) RETURNING id INTO v_expense_ledger_id;

      INSERT INTO public.fin_payables (
        supplier_id, amount, due_date, competence_date, description,
        document_number, ledger_entry_id, status, cost_center_id, notes
      ) VALUES (
        v_supplier_id, NEW.comissao_valor, v_competence_date, v_competence_date,
        'Comissão Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' - ' || COALESCE(v_arch_name, 'Arquiteto'),
        v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id,
        'Gerado automaticamente via pedido'
      );
    END IF;
  END IF;

  -- 3. Fee (Taxa da forma de pagamento)
  IF NEW.taxa_valor IS NOT NULL AND NEW.taxa_valor > 0 THEN
    SELECT supplier_id INTO v_fee_supplier_id FROM public.fee_supplier_configs WHERE fee_type = 'taxa_pagamento' LIMIT 1;

    IF v_has_cc_groups THEN
      FOR v_cc_group IN
        SELECT
          oi.centro_custo,
          cc.id as cc_id,
          cc.name as cc_name,
          SUM(oi.valor_total) as group_value
        FROM public.order_items oi
        LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%'
        WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != ''
        GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN
          v_proportion := v_cc_group.group_value / v_total_items_value;
        ELSE
          v_proportion := 1;
        END IF;
        v_proportional_amount := NEW.taxa_valor * v_proportion;
        v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, cash_date, document_number,
          party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id, chart_account_id
        ) VALUES (
          'Taxa ' || COALESCE(NEW.forma_pagamento, '') || ' Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']',
          v_proportional_amount, 'DESPESA', v_competence_date, NULL,
          v_doc_number, v_fee_supplier_id, 'supplier', 'ABERTO',
          'Taxa forma pagamento | CC: ' || v_cc_display_name,
          NEW.responsavel_id,
          v_cc_group.cc_id, NULL, v_first_ledger_id, NULL
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          supplier_id, amount, due_date, competence_date, description,
          document_number, ledger_entry_id, status, cost_center_id, notes
        ) VALUES (
          v_fee_supplier_id, v_proportional_amount, v_competence_date, v_competence_date,
          'Taxa ' || COALESCE(NEW.forma_pagamento, '') || ' Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']',
          v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id,
          'Gerado automaticamente via pedido'
        );
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id, chart_account_id
      ) VALUES (
        'Taxa ' || COALESCE(NEW.forma_pagamento, '') || ' Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text),
        NEW.taxa_valor, 'DESPESA', v_competence_date, NULL,
        v_doc_number, v_fee_supplier_id, 'supplier', 'ABERTO',
        'Taxa forma pagamento',
        NEW.responsavel_id,
        v_cost_center_id, NULL, v_first_ledger_id, NULL
      ) RETURNING id INTO v_expense_ledger_id;

      INSERT INTO public.fin_payables (
        supplier_id, amount, due_date, competence_date, description,
        document_number, ledger_entry_id, status, cost_center_id, notes
      ) VALUES (
        v_fee_supplier_id, NEW.taxa_valor, v_competence_date, v_competence_date,
        'Taxa ' || COALESCE(NEW.forma_pagamento, '') || ' Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text),
        v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id,
        'Gerado automaticamente via pedido'
      );
    END IF;
  END IF;

  -- 4. RT Fee (Retenção Técnica)
  IF NEW.rt_valor IS NOT NULL AND NEW.rt_valor > 0 THEN
    SELECT supplier_id INTO v_rt_supplier_id FROM public.fee_supplier_configs WHERE fee_type = 'retencao_tecnica' LIMIT 1;

    IF v_has_cc_groups THEN
      FOR v_cc_group IN
        SELECT
          oi.centro_custo,
          cc.id as cc_id,
          cc.name as cc_name,
          SUM(oi.valor_total) as group_value
        FROM public.order_items oi
        LEFT JOIN public.fin_cost_centers cc ON cc.name ILIKE '%' || oi.centro_custo || '%'
        WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo != ''
        GROUP BY oi.centro_custo, cc.id, cc.name
      LOOP
        IF v_total_items_value > 0 THEN
          v_proportion := v_cc_group.group_value / v_total_items_value;
        ELSE
          v_proportion := 1;
        END IF;
        v_proportional_amount := NEW.rt_valor * v_proportion;
        v_cc_display_name := COALESCE(v_cc_group.cc_name, v_cc_group.centro_custo);
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, cash_date, document_number,
          party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id, chart_account_id
        ) VALUES (
          'RT Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']',
          v_proportional_amount, 'DESPESA', v_competence_date, NULL,
          v_doc_number, v_rt_supplier_id, 'supplier', 'ABERTO',
          'Retenção técnica | CC: ' || v_cc_display_name,
          NEW.responsavel_id,
          v_cc_group.cc_id, NULL, v_first_ledger_id, NULL
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          supplier_id, amount, due_date, competence_date, description,
          document_number, ledger_entry_id, status, cost_center_id, notes
        ) VALUES (
          v_rt_supplier_id, v_proportional_amount, v_competence_date, v_competence_date,
          'RT Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text) || ' [CC: ' || v_cc_display_name || ']',
          v_doc_number, v_expense_ledger_id, 'ABERTO', v_cc_group.cc_id,
          'Gerado automaticamente via pedido'
        );
      END LOOP;
    ELSE
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id, chart_account_id
      ) VALUES (
        'RT Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text),
        NEW.rt_valor, 'DESPESA', v_competence_date, NULL,
        v_doc_number, v_rt_supplier_id, 'supplier', 'ABERTO',
        'Retenção técnica',
        NEW.responsavel_id,
        v_cost_center_id, NULL, v_first_ledger_id, NULL
      ) RETURNING id INTO v_expense_ledger_id;

      INSERT INTO public.fin_payables (
        supplier_id, amount, due_date, competence_date, description,
        document_number, ledger_entry_id, status, cost_center_id, notes
      ) VALUES (
        v_rt_supplier_id, NEW.rt_valor, v_competence_date, v_competence_date,
        'RT Pedido #' || COALESCE(NEW.numero_pedido::text, NEW.id::text),
        v_doc_number, v_expense_ledger_id, 'ABERTO', v_cost_center_id,
        'Gerado automaticamente via pedido'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
