
CREATE OR REPLACE FUNCTION public.create_receivable_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ledger_id uuid;
  v_cost_center_id uuid;
  v_doc_number text;
  v_competence_date date;
  v_expense_ledger_id uuid;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status 
      AND NEW.status IN ('ativo', 'faturado')
      AND (OLD.status NOT IN ('ativo', 'faturado') OR OLD.status IS NULL)) THEN
    
    -- Skip if already processed
    IF EXISTS (SELECT 1 FROM public.fin_receivables WHERE order_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    -- Resolve cost_center_id from name
    IF NEW.centro_custo IS NOT NULL AND NEW.centro_custo <> '' THEN
      SELECT id INTO v_cost_center_id FROM public.fin_cost_centers WHERE name = NEW.centro_custo LIMIT 1;
    END IF;

    v_doc_number := 'PED-' || NEW.order_number::text;
    v_competence_date := COALESCE(NEW.data_emissao::date, NOW()::date);

    IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
      -- 1. RECEITA PRINCIPAL
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date,
        document_number, party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, payment_method
      ) VALUES (
        'Pedido #' || NEW.order_number || ' - Receita',
        NEW.valor_total,
        'RECEITA',
        v_competence_date,
        NULL,
        v_doc_number,
        NEW.client_id,
        'client',
        'ABERTO',
        'Receita do Pedido #' || NEW.order_number,
        NEW.created_by,
        v_cost_center_id,
        NEW.project_id,
        NEW.forma_pagamento
      ) RETURNING id INTO v_ledger_id;

      -- Receivable with cost_center and project
      INSERT INTO public.fin_receivables (
        order_id, customer_id, amount, due_date, competence_date,
        status, description, document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id
      ) VALUES (
        NEW.id, NEW.client_id, NEW.valor_total,
        COALESCE(NEW.data_primeiro_vencimento::date, (NOW() + interval '30 days')::date),
        v_competence_date,
        'ABERTO',
        'Pedido #' || NEW.order_number,
        v_doc_number,
        'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
        v_ledger_id, NEW.created_by,
        v_cost_center_id,
        NEW.project_id
      );

      -- 2. DESPESA — Taxa Cartão
      IF COALESCE(NEW.taxa_cartao_responsavel, '') = 'tendenci' AND COALESCE(NEW.taxa_cartao_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, document_number,
          party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id
        ) VALUES (
          'PED #' || NEW.order_number || ' - Taxa Cartão (' || COALESCE(NEW.taxa_cartao_percentual, 0) || '%)',
          NEW.taxa_cartao_valor,
          'DESPESA',
          v_competence_date,
          v_doc_number,
          NEW.client_id, 'client', 'ABERTO',
          'Taxa cartão de crédito do Pedido #' || NEW.order_number || ' (' || COALESCE(NEW.taxa_cartao_percentual, 0) || '% sobre o valor)',
          NEW.created_by,
          v_cost_center_id, NEW.project_id, v_ledger_id
        );
      END IF;

      -- 3. DESPESA — Taxa Boleto
      IF COALESCE(NEW.taxa_boleto_responsavel, '') = 'tendenci' AND COALESCE(NEW.taxa_boleto_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, document_number,
          party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id
        ) VALUES (
          'PED #' || NEW.order_number || ' - Taxa Boleto (' || COALESCE(NEW.taxa_boleto_percentual, 0) || '%)',
          NEW.taxa_boleto_valor,
          'DESPESA',
          v_competence_date,
          v_doc_number,
          NEW.client_id, 'client', 'ABERTO',
          'Taxa boleto do Pedido #' || NEW.order_number || ' (' || COALESCE(NEW.taxa_boleto_percentual, 0) || '% sobre o valor)',
          NEW.created_by,
          v_cost_center_id, NEW.project_id, v_ledger_id
        );
      END IF;

      -- 4. DESPESA — RT (Recursos Tendenci)
      IF COALESCE(NEW.rt_habilitado, false) = true AND COALESCE(NEW.rt_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, document_number,
          party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id
        ) VALUES (
          'PED #' || NEW.order_number || ' - RT (' || COALESCE(NEW.rt_percentual, 0) || '%)',
          NEW.rt_valor,
          'DESPESA',
          v_competence_date,
          v_doc_number,
          NEW.client_id, 'client', 'ABERTO',
          'Recurso Tendenci do Pedido #' || NEW.order_number || ' (' || COALESCE(NEW.rt_percentual, 0) || '%)',
          NEW.created_by,
          v_cost_center_id, NEW.project_id, v_ledger_id
        );
      END IF;

      -- 5. DESPESA — Comissão Vendedor
      IF COALESCE(NEW.comissao_vendedor_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, document_number,
          party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id
        ) VALUES (
          'PED #' || NEW.order_number || ' - Comissão Vendedor (' || COALESCE(NEW.comissao_vendedor_percentual, 0) || '%)',
          NEW.comissao_vendedor_valor,
          'DESPESA',
          v_competence_date,
          v_doc_number,
          NEW.client_id, 'client', 'ABERTO',
          'Comissão vendedor do Pedido #' || NEW.order_number,
          NEW.created_by,
          v_cost_center_id, NEW.project_id, v_ledger_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          supplier_id, amount, due_date, competence_date, status,
          description, document_number, notes, ledger_entry_id, created_by,
          cost_center_id, project_id
        ) VALUES (
          NEW.comissao_vendedor_responsavel_id,
          NEW.comissao_vendedor_valor,
          (v_competence_date + interval '30 days')::date,
          v_competence_date,
          'ABERTO',
          'PED #' || NEW.order_number || ' - Comissão Vendedor',
          v_doc_number,
          'Comissão vendedor (' || COALESCE(NEW.comissao_vendedor_percentual, 0) || '%) do Pedido #' || NEW.order_number,
          v_expense_ledger_id, NEW.created_by,
          v_cost_center_id, NEW.project_id
        );
      END IF;

      -- 6. DESPESA — Comissão Orçamentista
      IF COALESCE(NEW.comissao_orcamentista_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, document_number,
          party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id
        ) VALUES (
          'PED #' || NEW.order_number || ' - Comissão Orçamentista (' || COALESCE(NEW.comissao_orcamentista_percentual, 0) || '%)',
          NEW.comissao_orcamentista_valor,
          'DESPESA',
          v_competence_date,
          v_doc_number,
          NEW.client_id, 'client', 'ABERTO',
          'Comissão orçamentista do Pedido #' || NEW.order_number,
          NEW.created_by,
          v_cost_center_id, NEW.project_id, v_ledger_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          supplier_id, amount, due_date, competence_date, status,
          description, document_number, notes, ledger_entry_id, created_by,
          cost_center_id, project_id
        ) VALUES (
          NEW.comissao_orcamentista_responsavel_id,
          NEW.comissao_orcamentista_valor,
          (v_competence_date + interval '30 days')::date,
          v_competence_date,
          'ABERTO',
          'PED #' || NEW.order_number || ' - Comissão Orçamentista',
          v_doc_number,
          'Comissão orçamentista (' || COALESCE(NEW.comissao_orcamentista_percentual, 0) || '%) do Pedido #' || NEW.order_number,
          v_expense_ledger_id, NEW.created_by,
          v_cost_center_id, NEW.project_id
        );
      END IF;

      -- 7. DESPESA — Comissão Projetista
      IF COALESCE(NEW.comissao_projetista_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, document_number,
          party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id
        ) VALUES (
          'PED #' || NEW.order_number || ' - Comissão Projetista (' || COALESCE(NEW.comissao_projetista_percentual, 0) || '%)',
          NEW.comissao_projetista_valor,
          'DESPESA',
          v_competence_date,
          v_doc_number,
          NEW.client_id, 'client', 'ABERTO',
          'Comissão projetista do Pedido #' || NEW.order_number,
          NEW.created_by,
          v_cost_center_id, NEW.project_id, v_ledger_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          supplier_id, amount, due_date, competence_date, status,
          description, document_number, notes, ledger_entry_id, created_by,
          cost_center_id, project_id
        ) VALUES (
          NEW.comissao_projetista_responsavel_id,
          NEW.comissao_projetista_valor,
          (v_competence_date + interval '30 days')::date,
          v_competence_date,
          'ABERTO',
          'PED #' || NEW.order_number || ' - Comissão Projetista',
          v_doc_number,
          'Comissão projetista (' || COALESCE(NEW.comissao_projetista_percentual, 0) || '%) do Pedido #' || NEW.order_number,
          v_expense_ledger_id, NEW.created_by,
          v_cost_center_id, NEW.project_id
        );
      END IF;

      -- 8. DESPESA — Comissão Montador
      IF COALESCE(NEW.comissao_montador_valor, 0) > 0 THEN
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, document_number,
          party_id, party_type, status, notes, created_by,
          cost_center_id, project_id, parent_entry_id
        ) VALUES (
          'PED #' || NEW.order_number || ' - Comissão Montador (' || COALESCE(NEW.comissao_montador_percentual, 0) || '%)',
          NEW.comissao_montador_valor,
          'DESPESA',
          v_competence_date,
          v_doc_number,
          NEW.client_id, 'client', 'ABERTO',
          'Comissão montador do Pedido #' || NEW.order_number,
          NEW.created_by,
          v_cost_center_id, NEW.project_id, v_ledger_id
        ) RETURNING id INTO v_expense_ledger_id;

        INSERT INTO public.fin_payables (
          supplier_id, amount, due_date, competence_date, status,
          description, document_number, notes, ledger_entry_id, created_by,
          cost_center_id, project_id
        ) VALUES (
          NEW.comissao_montador_responsavel_id,
          NEW.comissao_montador_valor,
          (v_competence_date + interval '30 days')::date,
          v_competence_date,
          'ABERTO',
          'PED #' || NEW.order_number || ' - Comissão Montador',
          v_doc_number,
          'Comissão montador (' || COALESCE(NEW.comissao_montador_percentual, 0) || '%) do Pedido #' || NEW.order_number,
          v_expense_ledger_id, NEW.created_by,
          v_cost_center_id, NEW.project_id
        );
      END IF;

    END IF;
  END IF;
  RETURN NEW;
END;
$$;
