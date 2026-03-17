
-- Function 1: create_receivable_from_order - Orçamentista/Projetista/Montador 100% CC Planejados
CREATE OR REPLACE FUNCTION public.create_receivable_from_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ledger_id uuid; v_doc_number text; v_competence_date date; v_expense_ledger_id uuid;
  v_item record; v_item_proportion numeric; v_item_count int;
  v_first_item_cost_center_id uuid; v_first_item_project_id uuid;
  v_main_cost_center_id uuid; v_main_project_id uuid;
  v_due_date date; v_planejados_cc_id uuid; v_first_ledger_id uuid;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status 
      AND NEW.status IN ('ativo', 'faturado')
      AND (OLD.status NOT IN ('ativo', 'faturado') OR OLD.status IS NULL)) THEN
    IF EXISTS (SELECT 1 FROM public.fin_receivables WHERE order_id = NEW.id) THEN RETURN NEW; END IF;
    v_doc_number := 'PED-' || NEW.order_number::text;
    v_competence_date := COALESCE(NEW.data_emissao::date, NOW()::date);
    v_due_date := v_competence_date;
    SELECT id INTO v_planejados_cc_id FROM public.fin_cost_centers WHERE name = 'Planejados' LIMIT 1;
    SELECT COUNT(*) INTO v_item_count FROM public.order_items WHERE order_id = NEW.id;
    IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
      v_first_ledger_id := NULL;
      FOR v_item IN 
        SELECT cc.id as cost_center_id, oi.centro_custo as cc_name,
          COALESCE(oi.project_id, NEW.project_id) as proj_id, SUM(oi.valor_total) as group_total
        FROM public.order_items oi LEFT JOIN public.fin_cost_centers cc ON cc.name = oi.centro_custo
        WHERE oi.order_id = NEW.id GROUP BY cc.id, oi.centro_custo, COALESCE(oi.project_id, NEW.project_id)
      LOOP
        v_item_proportion := CASE WHEN NEW.valor_total > 0 THEN v_item.group_total / NEW.valor_total ELSE 0 END;
        INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, payment_method)
        VALUES ('Pedido #' || NEW.order_number || ' - Receita' || CASE WHEN v_item.cc_name IS NOT NULL THEN ' (' || v_item.cc_name || ')' ELSE '' END,
          ROUND(v_item.group_total::numeric, 2), 'RECEITA', v_competence_date, NULL, v_doc_number, NEW.client_id, 'client', 'ABERTO',
          'Receita do Pedido #' || NEW.order_number || CASE WHEN v_item.cc_name IS NOT NULL THEN ' - CC: ' || v_item.cc_name ELSE '' END,
          NEW.created_by, v_item.cost_center_id, v_item.proj_id, NEW.forma_pagamento) RETURNING id INTO v_ledger_id;
        IF v_first_ledger_id IS NULL THEN v_first_ledger_id := v_ledger_id; END IF;
        INSERT INTO public.fin_receivables (order_id, customer_id, amount, due_date, competence_date, status, description, document_number, notes, ledger_entry_id, created_by, cost_center_id, project_id)
        VALUES (NEW.id, NEW.client_id, ROUND(v_item.group_total::numeric, 2), COALESCE(NEW.data_primeiro_vencimento::date, v_due_date), v_competence_date, 'ABERTO',
          'Pedido #' || NEW.order_number || CASE WHEN v_item.cc_name IS NOT NULL THEN ' (' || v_item.cc_name || ')' ELSE '' END,
          v_doc_number, 'Gerado automaticamente a partir do Pedido #' || NEW.order_number, v_ledger_id, NEW.created_by, v_item.cost_center_id, v_item.proj_id);
        -- Taxa Cartão (proportional)
        IF COALESCE(NEW.taxa_cartao_responsavel, '') = 'tendenci' AND COALESCE(NEW.taxa_cartao_valor, 0) > 0 THEN
          INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
          VALUES ('PED #' || NEW.order_number || ' - Taxa Cartão (' || COALESCE(NEW.taxa_cartao_percentual, 0) || '%)' || CASE WHEN v_item.cc_name IS NOT NULL THEN ' [' || v_item.cc_name || ']' ELSE '' END,
            ROUND((NEW.taxa_cartao_valor * v_item_proportion)::numeric, 2), 'DESPESA', v_competence_date, v_doc_number,
            NEW.client_id, 'client', 'ABERTO', 'Taxa cartão Pedido #' || NEW.order_number, NEW.created_by, v_item.cost_center_id, v_item.proj_id, v_ledger_id);
        END IF;
        -- Taxa Boleto (proportional)
        IF COALESCE(NEW.taxa_boleto_responsavel, '') = 'tendenci' AND COALESCE(NEW.taxa_boleto_valor, 0) > 0 THEN
          INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
          VALUES ('PED #' || NEW.order_number || ' - Taxa Boleto (' || COALESCE(NEW.taxa_boleto_percentual, 0) || '%)' || CASE WHEN v_item.cc_name IS NOT NULL THEN ' [' || v_item.cc_name || ']' ELSE '' END,
            ROUND((NEW.taxa_boleto_valor * v_item_proportion)::numeric, 2), 'DESPESA', v_competence_date, v_doc_number,
            NEW.client_id, 'client', 'ABERTO', 'Taxa boleto Pedido #' || NEW.order_number, NEW.created_by, v_item.cost_center_id, v_item.proj_id, v_ledger_id);
        END IF;
        -- RT (proportional)
        IF COALESCE(NEW.rt_habilitado, false) = true AND COALESCE(NEW.rt_valor, 0) > 0 THEN
          INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
          VALUES ('PED #' || NEW.order_number || ' - RT (' || COALESCE(NEW.rt_percentual, 0) || '%)' || CASE WHEN v_item.cc_name IS NOT NULL THEN ' [' || v_item.cc_name || ']' ELSE '' END,
            ROUND((NEW.rt_valor * v_item_proportion)::numeric, 2), 'DESPESA', v_competence_date, v_doc_number,
            NEW.client_id, 'client', 'ABERTO', 'RT Pedido #' || NEW.order_number, NEW.created_by, v_item.cost_center_id, v_item.proj_id, v_ledger_id);
        END IF;
        -- Comissão Vendedor (proportional)
        IF COALESCE(NEW.comissao_vendedor_valor, 0) > 0 THEN
          INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
          VALUES ('PED #' || NEW.order_number || ' - Comissão Vendedor (' || COALESCE(NEW.comissao_vendedor_percentual, 0) || '%)' || CASE WHEN v_item.cc_name IS NOT NULL THEN ' [' || v_item.cc_name || ']' ELSE '' END,
            ROUND((NEW.comissao_vendedor_valor * v_item_proportion)::numeric, 2), 'DESPESA', v_competence_date, v_doc_number,
            NEW.client_id, 'client', 'ABERTO', 'Comissão vendedor Pedido #' || NEW.order_number, NEW.created_by, v_item.cost_center_id, v_item.proj_id, v_ledger_id)
          RETURNING id INTO v_expense_ledger_id;
          INSERT INTO public.fin_payables (amount, due_date, competence_date, status, description, document_number, notes, ledger_entry_id, created_by, cost_center_id, project_id, supplier_id)
          VALUES (ROUND((NEW.comissao_vendedor_valor * v_item_proportion)::numeric, 2), v_due_date, v_competence_date, 'ABERTO',
            'PED #' || NEW.order_number || ' - Comissão Vendedor' || CASE WHEN v_item.cc_name IS NOT NULL THEN ' [' || v_item.cc_name || ']' ELSE '' END,
            v_doc_number, 'Comissão vendedor Pedido #' || NEW.order_number, v_expense_ledger_id, NEW.created_by, v_item.cost_center_id, v_item.proj_id, NEW.comissao_vendedor_responsavel_id);
        END IF;
      END LOOP;

      -- OUTSIDE LOOP: Orçamentista, Projetista, Montador → 100% CC Planejados
      IF COALESCE(NEW.comissao_orcamentista_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
        VALUES ('PED #' || NEW.order_number || ' - Comissão Orçamentista (' || COALESCE(NEW.comissao_orcamentista_percentual, 0) || '%) [Planejados]',
          ROUND(NEW.comissao_orcamentista_valor::numeric, 2), 'DESPESA', v_competence_date, v_doc_number,
          NEW.client_id, 'client', 'ABERTO', 'Comissão orçamentista Pedido #' || NEW.order_number, NEW.created_by, v_planejados_cc_id, NEW.project_id, v_first_ledger_id)
        RETURNING id INTO v_expense_ledger_id;
        INSERT INTO public.fin_payables (amount, due_date, competence_date, status, description, document_number, notes, ledger_entry_id, created_by, cost_center_id, project_id, supplier_id)
        VALUES (ROUND(NEW.comissao_orcamentista_valor::numeric, 2), v_due_date, v_competence_date, 'ABERTO',
          'PED #' || NEW.order_number || ' - Comissão Orçamentista [Planejados]', v_doc_number, 'Comissão orçamentista Pedido #' || NEW.order_number,
          v_expense_ledger_id, NEW.created_by, v_planejados_cc_id, NEW.project_id, NEW.comissao_orcamentista_responsavel_id);
      END IF;
      IF COALESCE(NEW.comissao_projetista_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
        VALUES ('PED #' || NEW.order_number || ' - Comissão Projetista (' || COALESCE(NEW.comissao_projetista_percentual, 0) || '%) [Planejados]',
          ROUND(NEW.comissao_projetista_valor::numeric, 2), 'DESPESA', v_competence_date, v_doc_number,
          NEW.client_id, 'client', 'ABERTO', 'Comissão projetista Pedido #' || NEW.order_number, NEW.created_by, v_planejados_cc_id, NEW.project_id, v_first_ledger_id)
        RETURNING id INTO v_expense_ledger_id;
        INSERT INTO public.fin_payables (amount, due_date, competence_date, status, description, document_number, notes, ledger_entry_id, created_by, cost_center_id, project_id, supplier_id)
        VALUES (ROUND(NEW.comissao_projetista_valor::numeric, 2), v_due_date, v_competence_date, 'ABERTO',
          'PED #' || NEW.order_number || ' - Comissão Projetista [Planejados]', v_doc_number, 'Comissão projetista Pedido #' || NEW.order_number,
          v_expense_ledger_id, NEW.created_by, v_planejados_cc_id, NEW.project_id, NEW.comissao_projetista_responsavel_id);
      END IF;
      IF COALESCE(NEW.comissao_montador_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
        VALUES ('PED #' || NEW.order_number || ' - Comissão Montador (' || COALESCE(NEW.comissao_montador_percentual, 0) || '%) [Planejados]',
          ROUND(NEW.comissao_montador_valor::numeric, 2), 'DESPESA', v_competence_date, v_doc_number,
          NEW.client_id, 'client', 'ABERTO', 'Comissão montador Pedido #' || NEW.order_number, NEW.created_by, v_planejados_cc_id, NEW.project_id, v_first_ledger_id)
        RETURNING id INTO v_expense_ledger_id;
        INSERT INTO public.fin_payables (amount, due_date, competence_date, status, description, document_number, notes, ledger_entry_id, created_by, cost_center_id, project_id, supplier_id)
        VALUES (ROUND(NEW.comissao_montador_valor::numeric, 2), v_due_date, v_competence_date, 'ABERTO',
          'PED #' || NEW.order_number || ' - Comissão Montador [Planejados]', v_doc_number, 'Comissão montador Pedido #' || NEW.order_number,
          v_expense_ledger_id, NEW.created_by, v_planejados_cc_id, NEW.project_id, NEW.comissao_montador_responsavel_id);
      END IF;

      -- Fallback if no items
      IF v_item_count = 0 THEN
        INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, payment_method)
        VALUES ('Pedido #' || NEW.order_number || ' - Receita', NEW.valor_total, 'RECEITA', v_competence_date, NULL, v_doc_number, NEW.client_id, 'client', 'ABERTO',
          'Receita do Pedido #' || NEW.order_number, NEW.created_by, NULL, NEW.project_id, NEW.forma_pagamento) RETURNING id INTO v_ledger_id;
        INSERT INTO public.fin_receivables (order_id, customer_id, amount, due_date, competence_date, status, description, document_number, notes, ledger_entry_id, created_by)
        VALUES (NEW.id, NEW.client_id, NEW.valor_total, COALESCE(NEW.data_primeiro_vencimento::date, v_due_date), v_competence_date, 'ABERTO',
          'Pedido #' || NEW.order_number, v_doc_number, 'Gerado automaticamente a partir do Pedido #' || NEW.order_number, v_ledger_id, NEW.created_by);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Function 2: update_financial_entries_on_order_edit - Same change
CREATE OR REPLACE FUNCTION public.update_financial_entries_on_order_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ledger_id uuid; v_doc_number text; v_competence_date date; v_expense_ledger_id uuid;
  v_item record; v_item_proportion numeric; v_item_count int;
  v_due_date date; v_planejados_cc_id uuid; v_first_ledger_id uuid;
BEGIN
  IF NOT (NEW.status IN ('ativo', 'faturado') AND OLD.status IN ('ativo', 'faturado')) THEN RETURN NEW; END IF;
  IF NEW.valor_total IS NOT DISTINCT FROM OLD.valor_total
    AND NEW.taxa_cartao_valor IS NOT DISTINCT FROM OLD.taxa_cartao_valor
    AND NEW.taxa_cartao_responsavel IS NOT DISTINCT FROM OLD.taxa_cartao_responsavel
    AND NEW.taxa_cartao_percentual IS NOT DISTINCT FROM OLD.taxa_cartao_percentual
    AND NEW.taxa_boleto_valor IS NOT DISTINCT FROM OLD.taxa_boleto_valor
    AND NEW.taxa_boleto_responsavel IS NOT DISTINCT FROM OLD.taxa_boleto_responsavel
    AND NEW.taxa_boleto_percentual IS NOT DISTINCT FROM OLD.taxa_boleto_percentual
    AND NEW.rt_habilitado IS NOT DISTINCT FROM OLD.rt_habilitado
    AND NEW.rt_valor IS NOT DISTINCT FROM OLD.rt_valor
    AND NEW.rt_percentual IS NOT DISTINCT FROM OLD.rt_percentual
    AND NEW.comissao_vendedor_valor IS NOT DISTINCT FROM OLD.comissao_vendedor_valor
    AND NEW.comissao_vendedor_percentual IS NOT DISTINCT FROM OLD.comissao_vendedor_percentual
    AND NEW.comissao_vendedor_responsavel_id IS NOT DISTINCT FROM OLD.comissao_vendedor_responsavel_id
    AND NEW.comissao_orcamentista_valor IS NOT DISTINCT FROM OLD.comissao_orcamentista_valor
    AND NEW.comissao_orcamentista_percentual IS NOT DISTINCT FROM OLD.comissao_orcamentista_percentual
    AND NEW.comissao_orcamentista_responsavel_id IS NOT DISTINCT FROM OLD.comissao_orcamentista_responsavel_id
    AND NEW.comissao_projetista_valor IS NOT DISTINCT FROM OLD.comissao_projetista_valor
    AND NEW.comissao_projetista_percentual IS NOT DISTINCT FROM OLD.comissao_projetista_percentual
    AND NEW.comissao_projetista_responsavel_id IS NOT DISTINCT FROM OLD.comissao_projetista_responsavel_id
    AND NEW.comissao_montador_valor IS NOT DISTINCT FROM OLD.comissao_montador_valor
    AND NEW.comissao_montador_percentual IS NOT DISTINCT FROM OLD.comissao_montador_percentual
    AND NEW.comissao_montador_responsavel_id IS NOT DISTINCT FROM OLD.comissao_montador_responsavel_id
    AND NEW.centro_custo IS NOT DISTINCT FROM OLD.centro_custo
    AND NEW.project_id IS NOT DISTINCT FROM OLD.project_id
    AND NEW.forma_pagamento IS NOT DISTINCT FROM OLD.forma_pagamento
    AND NEW.client_id IS NOT DISTINCT FROM OLD.client_id
  THEN RETURN NEW; END IF;

  v_doc_number := 'PED-' || NEW.order_number::text;
  v_competence_date := COALESCE(NEW.data_emissao::date, NOW()::date);
  v_due_date := v_competence_date;
  SELECT id INTO v_planejados_cc_id FROM public.fin_cost_centers WHERE name = 'Planejados' LIMIT 1;

  DELETE FROM public.fin_payables WHERE document_number = v_doc_number;
  DELETE FROM public.fin_ledger_entries WHERE document_number = v_doc_number AND parent_entry_id IS NOT NULL;
  DELETE FROM public.fin_receivables WHERE order_id = NEW.id;
  DELETE FROM public.fin_ledger_entries WHERE document_number = v_doc_number AND parent_entry_id IS NULL;

  SELECT COUNT(*) INTO v_item_count FROM public.order_items WHERE order_id = NEW.id;

  IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
    v_first_ledger_id := NULL;
    FOR v_item IN 
      SELECT cc.id as cost_center_id, oi.centro_custo as cc_name,
        COALESCE(oi.project_id, NEW.project_id) as proj_id, SUM(oi.valor_total) as group_total
      FROM public.order_items oi LEFT JOIN public.fin_cost_centers cc ON cc.name = oi.centro_custo
      WHERE oi.order_id = NEW.id GROUP BY cc.id, oi.centro_custo, COALESCE(oi.project_id, NEW.project_id)
    LOOP
      v_item_proportion := CASE WHEN NEW.valor_total > 0 THEN v_item.group_total / NEW.valor_total ELSE 0 END;
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, cash_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, payment_method)
      VALUES ('Pedido #' || NEW.order_number || ' - Receita' || CASE WHEN v_item.cc_name IS NOT NULL THEN ' (' || v_item.cc_name || ')' ELSE '' END,
        ROUND(v_item.group_total::numeric, 2), 'RECEITA', v_competence_date, NULL, v_doc_number,
        NEW.client_id, 'client', 'ABERTO', 'Atualizado - Receita do Pedido #' || NEW.order_number,
        NEW.created_by, v_item.cost_center_id, v_item.proj_id, NEW.forma_pagamento) RETURNING id INTO v_ledger_id;
      IF v_first_ledger_id IS NULL THEN v_first_ledger_id := v_ledger_id; END IF;
      INSERT INTO public.fin_receivables (order_id, customer_id, amount, due_date, competence_date, status, description, document_number, notes, ledger_entry_id, created_by, cost_center_id, project_id)
      VALUES (NEW.id, NEW.client_id, ROUND(v_item.group_total::numeric, 2), COALESCE(NEW.data_primeiro_vencimento::date, v_due_date), v_competence_date, 'ABERTO',
        'Pedido #' || NEW.order_number || CASE WHEN v_item.cc_name IS NOT NULL THEN ' (' || v_item.cc_name || ')' ELSE '' END,
        v_doc_number, 'Atualizado automaticamente', v_ledger_id, NEW.created_by, v_item.cost_center_id, v_item.proj_id);
      -- Taxa Cartão
      IF COALESCE(NEW.taxa_cartao_responsavel, '') = 'tendenci' AND COALESCE(NEW.taxa_cartao_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
        VALUES ('PED #' || NEW.order_number || ' - Taxa Cartão (' || COALESCE(NEW.taxa_cartao_percentual, 0) || '%)' || CASE WHEN v_item.cc_name IS NOT NULL THEN ' [' || v_item.cc_name || ']' ELSE '' END,
          ROUND((NEW.taxa_cartao_valor * v_item_proportion)::numeric, 2), 'DESPESA', v_competence_date, v_doc_number,
          NEW.client_id, 'client', 'ABERTO', 'Taxa cartão Pedido #' || NEW.order_number, NEW.created_by, v_item.cost_center_id, v_item.proj_id, v_ledger_id);
      END IF;
      -- Taxa Boleto
      IF COALESCE(NEW.taxa_boleto_responsavel, '') = 'tendenci' AND COALESCE(NEW.taxa_boleto_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
        VALUES ('PED #' || NEW.order_number || ' - Taxa Boleto (' || COALESCE(NEW.taxa_boleto_percentual, 0) || '%)' || CASE WHEN v_item.cc_name IS NOT NULL THEN ' [' || v_item.cc_name || ']' ELSE '' END,
          ROUND((NEW.taxa_boleto_valor * v_item_proportion)::numeric, 2), 'DESPESA', v_competence_date, v_doc_number,
          NEW.client_id, 'client', 'ABERTO', 'Taxa boleto Pedido #' || NEW.order_number, NEW.created_by, v_item.cost_center_id, v_item.proj_id, v_ledger_id);
      END IF;
      -- RT
      IF COALESCE(NEW.rt_habilitado, false) = true AND COALESCE(NEW.rt_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
        VALUES ('PED #' || NEW.order_number || ' - RT (' || COALESCE(NEW.rt_percentual, 0) || '%)' || CASE WHEN v_item.cc_name IS NOT NULL THEN ' [' || v_item.cc_name || ']' ELSE '' END,
          ROUND((NEW.rt_valor * v_item_proportion)::numeric, 2), 'DESPESA', v_competence_date, v_doc_number,
          NEW.client_id, 'client', 'ABERTO', 'RT Pedido #' || NEW.order_number, NEW.created_by, v_item.cost_center_id, v_item.proj_id, v_ledger_id);
      END IF;
      -- Comissão Vendedor (proportional)
      IF COALESCE(NEW.comissao_vendedor_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
        VALUES ('PED #' || NEW.order_number || ' - Comissão Vendedor (' || COALESCE(NEW.comissao_vendedor_percentual, 0) || '%)' || CASE WHEN v_item.cc_name IS NOT NULL THEN ' [' || v_item.cc_name || ']' ELSE '' END,
          ROUND((NEW.comissao_vendedor_valor * v_item_proportion)::numeric, 2), 'DESPESA', v_competence_date, v_doc_number,
          NEW.client_id, 'client', 'ABERTO', 'Comissão vendedor Pedido #' || NEW.order_number, NEW.created_by, v_item.cost_center_id, v_item.proj_id, v_ledger_id)
        RETURNING id INTO v_expense_ledger_id;
        INSERT INTO public.fin_payables (amount, due_date, competence_date, status, description, document_number, notes, ledger_entry_id, created_by, cost_center_id, project_id, supplier_id)
        VALUES (ROUND((NEW.comissao_vendedor_valor * v_item_proportion)::numeric, 2), v_due_date, v_competence_date, 'ABERTO',
          'PED #' || NEW.order_number || ' - Comissão Vendedor' || CASE WHEN v_item.cc_name IS NOT NULL THEN ' [' || v_item.cc_name || ']' ELSE '' END,
          v_doc_number, 'Comissão vendedor', v_expense_ledger_id, NEW.created_by, v_item.cost_center_id, v_item.proj_id, NEW.comissao_vendedor_responsavel_id);
      END IF;
    END LOOP;

    -- OUTSIDE LOOP: Orçamentista, Projetista, Montador → 100% CC Planejados
    IF COALESCE(NEW.comissao_orcamentista_valor, 0) > 0 THEN
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
      VALUES ('PED #' || NEW.order_number || ' - Comissão Orçamentista (' || COALESCE(NEW.comissao_orcamentista_percentual, 0) || '%) [Planejados]',
        ROUND(NEW.comissao_orcamentista_valor::numeric, 2), 'DESPESA', v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO', 'Comissão orçamentista Pedido #' || NEW.order_number, NEW.created_by, v_planejados_cc_id, NEW.project_id, v_first_ledger_id)
      RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (amount, due_date, competence_date, status, description, document_number, notes, ledger_entry_id, created_by, cost_center_id, project_id, supplier_id)
      VALUES (ROUND(NEW.comissao_orcamentista_valor::numeric, 2), v_due_date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Comissão Orçamentista [Planejados]', v_doc_number, 'Comissão orçamentista', v_expense_ledger_id, NEW.created_by,
        v_planejados_cc_id, NEW.project_id, NEW.comissao_orcamentista_responsavel_id);
    END IF;
    IF COALESCE(NEW.comissao_projetista_valor, 0) > 0 THEN
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
      VALUES ('PED #' || NEW.order_number || ' - Comissão Projetista (' || COALESCE(NEW.comissao_projetista_percentual, 0) || '%) [Planejados]',
        ROUND(NEW.comissao_projetista_valor::numeric, 2), 'DESPESA', v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO', 'Comissão projetista Pedido #' || NEW.order_number, NEW.created_by, v_planejados_cc_id, NEW.project_id, v_first_ledger_id)
      RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (amount, due_date, competence_date, status, description, document_number, notes, ledger_entry_id, created_by, cost_center_id, project_id, supplier_id)
      VALUES (ROUND(NEW.comissao_projetista_valor::numeric, 2), v_due_date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Comissão Projetista [Planejados]', v_doc_number, 'Comissão projetista', v_expense_ledger_id, NEW.created_by,
        v_planejados_cc_id, NEW.project_id, NEW.comissao_projetista_responsavel_id);
    END IF;
    IF COALESCE(NEW.comissao_montador_valor, 0) > 0 THEN
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, document_number, party_id, party_type, status, notes, created_by, cost_center_id, project_id, parent_entry_id)
      VALUES ('PED #' || NEW.order_number || ' - Comissão Montador (' || COALESCE(NEW.comissao_montador_percentual, 0) || '%) [Planejados]',
        ROUND(NEW.comissao_montador_valor::numeric, 2), 'DESPESA', v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO', 'Comissão montador Pedido #' || NEW.order_number, NEW.created_by, v_planejados_cc_id, NEW.project_id, v_first_ledger_id)
      RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (amount, due_date, competence_date, status, description, document_number, notes, ledger_entry_id, created_by, cost_center_id, project_id, supplier_id)
      VALUES (ROUND(NEW.comissao_montador_valor::numeric, 2), v_due_date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Comissão Montador [Planejados]', v_doc_number, 'Comissão montador', v_expense_ledger_id, NEW.created_by,
        v_planejados_cc_id, NEW.project_id, NEW.comissao_montador_responsavel_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
