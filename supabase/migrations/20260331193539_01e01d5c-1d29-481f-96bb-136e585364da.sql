CREATE OR REPLACE FUNCTION public.update_financial_entries_on_order_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ledger_id uuid;
  v_cost_center_id uuid;
  v_doc_number text;
  v_competence_date date;
  v_expense_ledger_id uuid;
  v_responsible_name text;
  v_chart_account_id uuid;
  v_supplier_id uuid;
  v_centro_custo_name text;
  v_fee_supplier_id uuid;
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
    
    IF OLD.status IN ('ativo', 'faturado', 'em_producao') AND NEW.status IN ('ativo', 'faturado', 'em_producao') THEN
      IF NEW.valor_total IS NOT DISTINCT FROM OLD.valor_total
        AND NEW.taxa_cartao_valor IS NOT DISTINCT FROM OLD.taxa_cartao_valor
        AND NEW.taxa_cartao_responsavel IS NOT DISTINCT FROM OLD.taxa_cartao_responsavel
        AND NEW.taxa_boleto_valor IS NOT DISTINCT FROM OLD.taxa_boleto_valor
        AND NEW.taxa_boleto_responsavel IS NOT DISTINCT FROM OLD.taxa_boleto_responsavel
        AND NEW.taxa_link_valor IS NOT DISTINCT FROM OLD.taxa_link_valor
        AND NEW.taxa_link_responsavel IS NOT DISTINCT FROM OLD.taxa_link_responsavel
        AND NEW.rt_habilitado IS NOT DISTINCT FROM OLD.rt_habilitado
        AND NEW.rt_valor IS NOT DISTINCT FROM OLD.rt_valor
        AND NEW.comissao_vendedor_valor IS NOT DISTINCT FROM OLD.comissao_vendedor_valor
        AND NEW.comissao_vendedor_responsavel_id IS NOT DISTINCT FROM OLD.comissao_vendedor_responsavel_id
        AND NEW.comissao_orcamentista_valor IS NOT DISTINCT FROM OLD.comissao_orcamentista_valor
        AND NEW.comissao_orcamentista_responsavel_id IS NOT DISTINCT FROM OLD.comissao_orcamentista_responsavel_id
        AND NEW.comissao_projetista_valor IS NOT DISTINCT FROM OLD.comissao_projetista_valor
        AND NEW.comissao_projetista_responsavel_id IS NOT DISTINCT FROM OLD.comissao_projetista_responsavel_id
        AND NEW.comissao_montador_valor IS NOT DISTINCT FROM OLD.comissao_montador_valor
        AND NEW.comissao_montador_responsavel_id IS NOT DISTINCT FROM OLD.comissao_montador_responsavel_id
        AND NEW.comissao_producao_valor IS NOT DISTINCT FROM OLD.comissao_producao_valor
        AND NEW.comissao_producao_responsavel_id IS NOT DISTINCT FROM OLD.comissao_producao_responsavel_id
        AND NEW.centro_custo IS NOT DISTINCT FROM OLD.centro_custo
        AND NEW.project_id IS NOT DISTINCT FROM OLD.project_id
        AND NEW.forma_pagamento IS NOT DISTINCT FROM OLD.forma_pagamento
        AND NEW.client_id IS NOT DISTINCT FROM OLD.client_id
      THEN
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  v_doc_number := 'PED-' || NEW.order_number::text;
  v_competence_date := COALESCE(NEW.data_emissao::date, NOW()::date);

  v_cost_center_id := NULL;
  v_centro_custo_name := NEW.centro_custo;
  
  IF v_centro_custo_name IS NULL OR v_centro_custo_name = '' THEN
    SELECT DISTINCT oi.centro_custo INTO v_centro_custo_name
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id AND oi.centro_custo IS NOT NULL AND oi.centro_custo <> ''
    LIMIT 1;
  END IF;
  
  IF v_centro_custo_name IS NOT NULL AND v_centro_custo_name <> '' THEN
    SELECT id INTO v_cost_center_id FROM public.fin_cost_centers WHERE name = v_centro_custo_name LIMIT 1;
  END IF;

  DELETE FROM public.fin_payables WHERE document_number = v_doc_number;
  DELETE FROM public.fin_ledger_entries WHERE document_number = v_doc_number AND parent_entry_id IS NOT NULL;
  DELETE FROM public.fin_receivables WHERE order_id = NEW.id;
  DELETE FROM public.fin_ledger_entries WHERE document_number = v_doc_number AND parent_entry_id IS NULL;

  IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
    SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '1' LIMIT 1;

    INSERT INTO public.fin_ledger_entries (
      description, amount, type, competence_date, cash_date,
      document_number, party_id, party_type, status, notes, created_by,
      cost_center_id, project_id, payment_method, chart_account_id
    ) VALUES (
      'Pedido #' || NEW.order_number || ' - Receita',
      NEW.valor_total, 'RECEITA', v_competence_date, v_competence_date,
      v_doc_number, NEW.client_id, 'client', 'ABERTO',
      'Receita do Pedido #' || NEW.order_number,
      NEW.created_by, v_cost_center_id, NEW.project_id, NEW.forma_pagamento, v_chart_account_id
    ) RETURNING id INTO v_ledger_id;

    INSERT INTO public.fin_receivables (
      order_id, customer_id, amount, due_date, competence_date,
      status, description, document_number, notes, ledger_entry_id, created_by,
      cost_center_id, project_id, chart_account_id
    ) VALUES (
      NEW.id, NEW.client_id, NEW.valor_total,
      COALESCE(NEW.data_primeiro_vencimento::date, (NOW() + interval '30 days')::date),
      v_competence_date, 'ABERTO',
      'Pedido #' || NEW.order_number, v_doc_number,
      'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
      v_ledger_id, NEW.created_by, v_cost_center_id, NEW.project_id, v_chart_account_id
    );

    -- Taxa Cartão
    IF COALESCE(NEW.taxa_cartao_responsavel, '') = 'tendenci' AND COALESCE(NEW.taxa_cartao_valor, 0) > 0 THEN
      SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '3.2' LIMIT 1;
      -- Determine fee type based on forma_pagamento
      v_fee_supplier_id := NULL;
      IF NEW.forma_pagamento = 'cartao_debito' THEN
        SELECT supplier_id INTO v_fee_supplier_id FROM public.fee_supplier_configs WHERE fee_type = 'cartao_debito' LIMIT 1;
      ELSE
        SELECT supplier_id INTO v_fee_supplier_id FROM public.fee_supplier_configs WHERE fee_type = 'cartao_credito' LIMIT 1;
      END IF;
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id, chart_account_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Taxa Cartão (' || COALESCE(NEW.taxa_cartao_percentual, 0) || '%)',
        NEW.taxa_cartao_valor, 'DESPESA', v_competence_date, v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Taxa cartão do Pedido #' || NEW.order_number,
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id, v_chart_account_id
      ) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (
        amount, due_date, competence_date, status, description,
        document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id, order_id, chart_account_id, supplier_id
      ) VALUES (
        NEW.taxa_cartao_valor,
        (NOW() + interval '30 days')::date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Taxa Cartão (' || COALESCE(NEW.taxa_cartao_percentual, 0) || '%)',
        v_doc_number,
        'Taxa cartão do Pedido #' || NEW.order_number,
        v_expense_ledger_id, NEW.created_by, v_cost_center_id, NEW.project_id, NEW.id, v_chart_account_id, v_fee_supplier_id
      );
    END IF;

    -- Taxa Boleto
    IF COALESCE(NEW.taxa_boleto_responsavel, '') = 'tendenci' AND COALESCE(NEW.taxa_boleto_valor, 0) > 0 THEN
      SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '3.2' LIMIT 1;
      SELECT supplier_id INTO v_fee_supplier_id FROM public.fee_supplier_configs WHERE fee_type = 'boleto' LIMIT 1;
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id, chart_account_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Taxa Boleto (' || COALESCE(NEW.taxa_boleto_percentual, 0) || '%)',
        NEW.taxa_boleto_valor, 'DESPESA', v_competence_date, v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Taxa boleto do Pedido #' || NEW.order_number,
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id, v_chart_account_id
      ) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (
        amount, due_date, competence_date, status, description,
        document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id, order_id, chart_account_id, supplier_id
      ) VALUES (
        NEW.taxa_boleto_valor,
        (NOW() + interval '30 days')::date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Taxa Boleto (' || COALESCE(NEW.taxa_boleto_percentual, 0) || '%)',
        v_doc_number,
        'Taxa boleto do Pedido #' || NEW.order_number,
        v_expense_ledger_id, NEW.created_by, v_cost_center_id, NEW.project_id, NEW.id, v_chart_account_id, v_fee_supplier_id
      );
    END IF;

    -- Taxa Link de Pagamento
    IF COALESCE(NEW.taxa_link_responsavel, '') = 'tendenci' AND COALESCE(NEW.taxa_link_valor, 0) > 0 THEN
      SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '3.2' LIMIT 1;
      SELECT supplier_id INTO v_fee_supplier_id FROM public.fee_supplier_configs WHERE fee_type = 'link_pagamento' LIMIT 1;
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id, chart_account_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Taxa Link (' || COALESCE(NEW.taxa_link_percentual, 0) || '%)',
        NEW.taxa_link_valor, 'DESPESA', v_competence_date, v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Taxa link de pagamento do Pedido #' || NEW.order_number,
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id, v_chart_account_id
      ) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (
        amount, due_date, competence_date, status, description,
        document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id, order_id, chart_account_id, supplier_id
      ) VALUES (
        NEW.taxa_link_valor,
        (NOW() + interval '30 days')::date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Taxa Link (' || COALESCE(NEW.taxa_link_percentual, 0) || '%)',
        v_doc_number,
        'Taxa link de pagamento do Pedido #' || NEW.order_number,
        v_expense_ledger_id, NEW.created_by, v_cost_center_id, NEW.project_id, NEW.id, v_chart_account_id, v_fee_supplier_id
      );
    END IF;

    -- RT
    IF COALESCE(NEW.rt_habilitado, false) = true AND COALESCE(NEW.rt_valor, 0) > 0 THEN
      SELECT COALESCE(src.chart_account_id, (SELECT id FROM public.fin_chart_accounts WHERE code = '3.1.1' LIMIT 1))
        INTO v_chart_account_id
        FROM public.fin_strategic_resource_account_configs src WHERE src.resource_type = 'rt' LIMIT 1;
      IF v_chart_account_id IS NULL THEN
        SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '3.1.1' LIMIT 1;
      END IF;
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id, chart_account_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - RT (' || COALESCE(NEW.rt_percentual, 0) || '%)',
        NEW.rt_valor, 'DESPESA', v_competence_date, v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Recurso Tendenci do Pedido #' || NEW.order_number,
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id, v_chart_account_id
      ) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (
        amount, due_date, competence_date, status, description,
        document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id, order_id, chart_account_id
      ) VALUES (
        NEW.rt_valor,
        (NOW() + interval '30 days')::date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - RT (' || COALESCE(NEW.rt_percentual, 0) || '%)',
        v_doc_number,
        'Recurso Tendenci do Pedido #' || NEW.order_number,
        v_expense_ledger_id, NEW.created_by, v_cost_center_id, NEW.project_id, NEW.id, v_chart_account_id
      );
    END IF;

    -- Comissão Vendedor
    IF COALESCE(NEW.comissao_vendedor_valor, 0) > 0 THEN
      v_responsible_name := NULL;
      v_supplier_id := NULL;
      IF NEW.comissao_vendedor_responsavel_id IS NOT NULL THEN
        SELECT r.name, r.supplier_id INTO v_responsible_name, v_supplier_id FROM order_responsibles r WHERE r.id = NEW.comissao_vendedor_responsavel_id;
      END IF;
      SELECT COALESCE(src.chart_account_id, (SELECT id FROM public.fin_chart_accounts WHERE code = '3.1.2' LIMIT 1))
        INTO v_chart_account_id
        FROM public.fin_strategic_resource_account_configs src WHERE src.resource_type = 'vendedor' LIMIT 1;
      IF v_chart_account_id IS NULL THEN
        SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '3.1.2' LIMIT 1;
      END IF;
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id, chart_account_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Comissão Vendedor' || COALESCE(' (' || v_responsible_name || ')', ''),
        NEW.comissao_vendedor_valor, 'DESPESA', v_competence_date, v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Comissão vendedor do Pedido #' || NEW.order_number || COALESCE(' - ' || v_responsible_name, ''),
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id, v_chart_account_id
      ) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (
        amount, due_date, competence_date, status, description,
        document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id, order_id, chart_account_id, supplier_id
      ) VALUES (
        NEW.comissao_vendedor_valor,
        (NOW() + interval '30 days')::date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Comissão Vendedor' || COALESCE(' (' || v_responsible_name || ')', ''),
        v_doc_number,
        'Comissão vendedor do Pedido #' || NEW.order_number || COALESCE(' - ' || v_responsible_name, ''),
        v_expense_ledger_id, NEW.created_by, v_cost_center_id, NEW.project_id, NEW.id, v_chart_account_id, v_supplier_id
      );
    END IF;

    -- Comissão Orçamentista
    IF COALESCE(NEW.comissao_orcamentista_valor, 0) > 0 THEN
      v_responsible_name := NULL;
      v_supplier_id := NULL;
      IF NEW.comissao_orcamentista_responsavel_id IS NOT NULL THEN
        SELECT r.name, r.supplier_id INTO v_responsible_name, v_supplier_id FROM order_responsibles r WHERE r.id = NEW.comissao_orcamentista_responsavel_id;
      END IF;
      SELECT COALESCE(src.chart_account_id, (SELECT id FROM public.fin_chart_accounts WHERE code = '3.1.2' LIMIT 1))
        INTO v_chart_account_id
        FROM public.fin_strategic_resource_account_configs src WHERE src.resource_type = 'orcamentista' LIMIT 1;
      IF v_chart_account_id IS NULL THEN
        SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '3.1.2' LIMIT 1;
      END IF;
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id, chart_account_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Comissão Orçamentista' || COALESCE(' (' || v_responsible_name || ')', ''),
        NEW.comissao_orcamentista_valor, 'DESPESA', v_competence_date, v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Comissão orçamentista do Pedido #' || NEW.order_number || COALESCE(' - ' || v_responsible_name, ''),
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id, v_chart_account_id
      ) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (
        amount, due_date, competence_date, status, description,
        document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id, order_id, chart_account_id, supplier_id
      ) VALUES (
        NEW.comissao_orcamentista_valor,
        (NOW() + interval '30 days')::date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Comissão Orçamentista' || COALESCE(' (' || v_responsible_name || ')', ''),
        v_doc_number,
        'Comissão orçamentista do Pedido #' || NEW.order_number || COALESCE(' - ' || v_responsible_name, ''),
        v_expense_ledger_id, NEW.created_by, v_cost_center_id, NEW.project_id, NEW.id, v_chart_account_id, v_supplier_id
      );
    END IF;

    -- Comissão Projetista
    IF COALESCE(NEW.comissao_projetista_valor, 0) > 0 THEN
      v_responsible_name := NULL;
      v_supplier_id := NULL;
      IF NEW.comissao_projetista_responsavel_id IS NOT NULL THEN
        SELECT r.name, r.supplier_id INTO v_responsible_name, v_supplier_id FROM order_responsibles r WHERE r.id = NEW.comissao_projetista_responsavel_id;
      END IF;
      SELECT COALESCE(src.chart_account_id, (SELECT id FROM public.fin_chart_accounts WHERE code = '3.1.2' LIMIT 1))
        INTO v_chart_account_id
        FROM public.fin_strategic_resource_account_configs src WHERE src.resource_type = 'projetista' LIMIT 1;
      IF v_chart_account_id IS NULL THEN
        SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '3.1.2' LIMIT 1;
      END IF;
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id, chart_account_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Comissão Projetista' || COALESCE(' (' || v_responsible_name || ')', ''),
        NEW.comissao_projetista_valor, 'DESPESA', v_competence_date, v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Comissão projetista do Pedido #' || NEW.order_number || COALESCE(' - ' || v_responsible_name, ''),
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id, v_chart_account_id
      ) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (
        amount, due_date, competence_date, status, description,
        document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id, order_id, chart_account_id, supplier_id
      ) VALUES (
        NEW.comissao_projetista_valor,
        (NOW() + interval '30 days')::date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Comissão Projetista' || COALESCE(' (' || v_responsible_name || ')', ''),
        v_doc_number,
        'Comissão projetista do Pedido #' || NEW.order_number || COALESCE(' - ' || v_responsible_name, ''),
        v_expense_ledger_id, NEW.created_by, v_cost_center_id, NEW.project_id, NEW.id, v_chart_account_id, v_supplier_id
      );
    END IF;

    -- Comissão Montador
    IF COALESCE(NEW.comissao_montador_valor, 0) > 0 THEN
      v_responsible_name := NULL;
      v_supplier_id := NULL;
      IF NEW.comissao_montador_responsavel_id IS NOT NULL THEN
        SELECT r.name, r.supplier_id INTO v_responsible_name, v_supplier_id FROM order_responsibles r WHERE r.id = NEW.comissao_montador_responsavel_id;
      END IF;
      SELECT COALESCE(src.chart_account_id, (SELECT id FROM public.fin_chart_accounts WHERE code = '3.1.2' LIMIT 1))
        INTO v_chart_account_id
        FROM public.fin_strategic_resource_account_configs src WHERE src.resource_type = 'montador' LIMIT 1;
      IF v_chart_account_id IS NULL THEN
        SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '3.1.2' LIMIT 1;
      END IF;
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id, chart_account_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Comissão Montador' || COALESCE(' (' || v_responsible_name || ')', ''),
        NEW.comissao_montador_valor, 'DESPESA', v_competence_date, v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Comissão montador do Pedido #' || NEW.order_number || COALESCE(' - ' || v_responsible_name, ''),
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id, v_chart_account_id
      ) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (
        amount, due_date, competence_date, status, description,
        document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id, order_id, chart_account_id, supplier_id
      ) VALUES (
        NEW.comissao_montador_valor,
        (NOW() + interval '30 days')::date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Comissão Montador' || COALESCE(' (' || v_responsible_name || ')', ''),
        v_doc_number,
        'Comissão montador do Pedido #' || NEW.order_number || COALESCE(' - ' || v_responsible_name, ''),
        v_expense_ledger_id, NEW.created_by, v_cost_center_id, NEW.project_id, NEW.id, v_chart_account_id, v_supplier_id
      );
    END IF;

    -- Comissão Produção
    IF COALESCE(NEW.comissao_producao_valor, 0) > 0 THEN
      v_responsible_name := NULL;
      v_supplier_id := NULL;
      IF NEW.comissao_producao_responsavel_id IS NOT NULL THEN
        SELECT r.name, r.supplier_id INTO v_responsible_name, v_supplier_id FROM order_responsibles r WHERE r.id = NEW.comissao_producao_responsavel_id;
      END IF;
      SELECT COALESCE(src.chart_account_id, (SELECT id FROM public.fin_chart_accounts WHERE code = '3.1.2' LIMIT 1))
        INTO v_chart_account_id
        FROM public.fin_strategic_resource_account_configs src WHERE src.resource_type = 'producao' LIMIT 1;
      IF v_chart_account_id IS NULL THEN
        SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '3.1.2' LIMIT 1;
      END IF;
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id, chart_account_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Comissão Produção' || COALESCE(' (' || v_responsible_name || ')', ''),
        NEW.comissao_producao_valor, 'DESPESA', v_competence_date, v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Comissão produção do Pedido #' || NEW.order_number || COALESCE(' - ' || v_responsible_name, ''),
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id, v_chart_account_id
      ) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (
        amount, due_date, competence_date, status, description,
        document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id, order_id, chart_account_id, supplier_id
      ) VALUES (
        NEW.comissao_producao_valor,
        (NOW() + interval '30 days')::date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Comissão Produção' || COALESCE(' (' || v_responsible_name || ')', ''),
        v_doc_number,
        'Comissão produção do Pedido #' || NEW.order_number || COALESCE(' - ' || v_responsible_name, ''),
        v_expense_ledger_id, NEW.created_by, v_cost_center_id, NEW.project_id, NEW.id, v_chart_account_id, v_supplier_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;