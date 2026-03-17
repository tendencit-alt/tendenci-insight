
-- Create a separate trigger function to handle financial entry updates when an approved order is edited
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
  v_old_main_ledger_id uuid;
BEGIN
  -- Only run when an already-approved order is updated (status stays ativo/faturado)
  IF NOT (NEW.status IN ('ativo', 'faturado') AND OLD.status IN ('ativo', 'faturado')) THEN
    RETURN NEW;
  END IF;

  -- Only run if financial-relevant fields changed
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
  THEN
    RETURN NEW;
  END IF;

  v_doc_number := 'PED-' || NEW.order_number::text;
  v_competence_date := COALESCE(NEW.data_emissao::date, NOW()::date);

  -- Resolve cost_center_id from name
  v_cost_center_id := NULL;
  IF NEW.centro_custo IS NOT NULL AND NEW.centro_custo <> '' THEN
    SELECT id INTO v_cost_center_id FROM public.fin_cost_centers WHERE name = NEW.centro_custo LIMIT 1;
  END IF;

  -- Get the main ledger entry id before deleting
  SELECT id INTO v_old_main_ledger_id FROM public.fin_ledger_entries 
    WHERE document_number = v_doc_number AND type = 'RECEITA' AND parent_entry_id IS NULL
    LIMIT 1;

  -- Delete old payables linked to this order's document
  DELETE FROM public.fin_payables WHERE document_number = v_doc_number;

  -- Delete old expense ledger entries (children first)
  DELETE FROM public.fin_ledger_entries WHERE document_number = v_doc_number AND parent_entry_id IS NOT NULL;

  -- Delete old receivable
  DELETE FROM public.fin_receivables WHERE order_id = NEW.id;

  -- Delete old main revenue entry
  DELETE FROM public.fin_ledger_entries WHERE document_number = v_doc_number AND parent_entry_id IS NULL;

  -- Now recreate all entries (same logic as create_receivable_from_order)
  IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
    -- 1. RECEITA PRINCIPAL
    INSERT INTO public.fin_ledger_entries (
      description, amount, type, competence_date, cash_date,
      document_number, party_id, party_type, status, notes, created_by,
      cost_center_id, project_id, payment_method
    ) VALUES (
      'Pedido #' || NEW.order_number || ' - Receita',
      NEW.valor_total, 'RECEITA', v_competence_date, NULL,
      v_doc_number, NEW.client_id, 'client', 'ABERTO',
      'Receita do Pedido #' || NEW.order_number,
      NEW.created_by, v_cost_center_id, NEW.project_id, NEW.forma_pagamento
    ) RETURNING id INTO v_ledger_id;

    -- Receivable
    INSERT INTO public.fin_receivables (
      order_id, customer_id, amount, due_date, competence_date,
      status, description, document_number, notes, ledger_entry_id, created_by,
      cost_center_id, project_id
    ) VALUES (
      NEW.id, NEW.client_id, NEW.valor_total,
      COALESCE(NEW.data_primeiro_vencimento::date, (NOW() + interval '30 days')::date),
      v_competence_date, 'ABERTO',
      'Pedido #' || NEW.order_number, v_doc_number,
      'Atualizado automaticamente a partir do Pedido #' || NEW.order_number,
      v_ledger_id, NEW.created_by, v_cost_center_id, NEW.project_id
    );

    -- 2. Taxa Cartão
    IF COALESCE(NEW.taxa_cartao_responsavel, '') = 'tendenci' AND COALESCE(NEW.taxa_cartao_valor, 0) > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Taxa Cartão (' || COALESCE(NEW.taxa_cartao_percentual, 0) || '%)',
        NEW.taxa_cartao_valor, 'DESPESA', v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Taxa cartão de crédito do Pedido #' || NEW.order_number || ' (' || COALESCE(NEW.taxa_cartao_percentual, 0) || '% sobre o valor)',
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id
      );
    END IF;

    -- 3. Taxa Boleto
    IF COALESCE(NEW.taxa_boleto_responsavel, '') = 'tendenci' AND COALESCE(NEW.taxa_boleto_valor, 0) > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Taxa Boleto (' || COALESCE(NEW.taxa_boleto_percentual, 0) || '%)',
        NEW.taxa_boleto_valor, 'DESPESA', v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Taxa boleto do Pedido #' || NEW.order_number,
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id
      );
    END IF;

    -- 4. RT
    IF COALESCE(NEW.rt_habilitado, false) = true AND COALESCE(NEW.rt_valor, 0) > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - RT (' || COALESCE(NEW.rt_percentual, 0) || '%)',
        NEW.rt_valor, 'DESPESA', v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Recurso Tendenci do Pedido #' || NEW.order_number || ' (' || COALESCE(NEW.rt_percentual, 0) || '%)',
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id
      );
    END IF;

    -- 5. Comissão Vendedor
    IF COALESCE(NEW.comissao_vendedor_valor, 0) > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Comissão Vendedor (' || COALESCE(NEW.comissao_vendedor_percentual, 0) || '%)',
        NEW.comissao_vendedor_valor, 'DESPESA', v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Comissão vendedor do Pedido #' || NEW.order_number,
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id
      ) RETURNING id INTO v_expense_ledger_id;

      INSERT INTO public.fin_payables (
        amount, due_date, competence_date, status, description,
        document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id, supplier_id
      ) VALUES (
        NEW.comissao_vendedor_valor,
        (NOW() + interval '30 days')::date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Comissão Vendedor', v_doc_number,
        'Comissão vendedor do Pedido #' || NEW.order_number,
        v_expense_ledger_id, NEW.created_by,
        v_cost_center_id, NEW.project_id, NEW.comissao_vendedor_responsavel_id
      );
    END IF;

    -- 6. Comissão Orçamentista
    IF COALESCE(NEW.comissao_orcamentista_valor, 0) > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Comissão Orçamentista (' || COALESCE(NEW.comissao_orcamentista_percentual, 0) || '%)',
        NEW.comissao_orcamentista_valor, 'DESPESA', v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Comissão orçamentista do Pedido #' || NEW.order_number,
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id
      ) RETURNING id INTO v_expense_ledger_id;

      INSERT INTO public.fin_payables (
        amount, due_date, competence_date, status, description,
        document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id, supplier_id
      ) VALUES (
        NEW.comissao_orcamentista_valor,
        (NOW() + interval '30 days')::date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Comissão Orçamentista', v_doc_number,
        'Comissão orçamentista do Pedido #' || NEW.order_number,
        v_expense_ledger_id, NEW.created_by,
        v_cost_center_id, NEW.project_id, NEW.comissao_orcamentista_responsavel_id
      );
    END IF;

    -- 7. Comissão Projetista
    IF COALESCE(NEW.comissao_projetista_valor, 0) > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Comissão Projetista (' || COALESCE(NEW.comissao_projetista_percentual, 0) || '%)',
        NEW.comissao_projetista_valor, 'DESPESA', v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Comissão projetista do Pedido #' || NEW.order_number,
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id
      ) RETURNING id INTO v_expense_ledger_id;

      INSERT INTO public.fin_payables (
        amount, due_date, competence_date, status, description,
        document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id, supplier_id
      ) VALUES (
        NEW.comissao_projetista_valor,
        (NOW() + interval '30 days')::date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Comissão Projetista', v_doc_number,
        'Comissão projetista do Pedido #' || NEW.order_number,
        v_expense_ledger_id, NEW.created_by,
        v_cost_center_id, NEW.project_id, NEW.comissao_projetista_responsavel_id
      );
    END IF;

    -- 8. Comissão Montador
    IF COALESCE(NEW.comissao_montador_valor, 0) > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Comissão Montador (' || COALESCE(NEW.comissao_montador_percentual, 0) || '%)',
        ROUND(NEW.comissao_montador_valor::numeric, 2), 'DESPESA', v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Comissão montador do Pedido #' || NEW.order_number,
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id
      ) RETURNING id INTO v_expense_ledger_id;

      INSERT INTO public.fin_payables (
        amount, due_date, competence_date, status, description,
        document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id, supplier_id
      ) VALUES (
        ROUND(NEW.comissao_montador_valor::numeric, 2),
        (NOW() + interval '30 days')::date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Comissão Montador', v_doc_number,
        'Comissão montador do Pedido #' || NEW.order_number,
        v_expense_ledger_id, NEW.created_by,
        v_cost_center_id, NEW.project_id, NEW.comissao_montador_responsavel_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger (runs AFTER the create trigger, with higher priority)
DROP TRIGGER IF EXISTS trg_update_financial_on_order_edit ON public.orders;
CREATE TRIGGER trg_update_financial_on_order_edit
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_financial_entries_on_order_edit();
