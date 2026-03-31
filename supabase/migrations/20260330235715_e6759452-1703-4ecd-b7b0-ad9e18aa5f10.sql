
-- =============================================
-- FIX: Production trigger should check for 'ativo' not 'aprovado'
-- And financial edit trigger should handle rascunho→ativo transition
-- =============================================

-- 1. Fix production trigger to use 'ativo' instead of 'aprovado'
CREATE OR REPLACE FUNCTION public.create_production_on_order_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_production_type_id UUID;
  v_production_type_name TEXT;
  v_start_phase_id UUID;
  v_client_name TEXT;
  v_new_op_id UUID;
  v_item RECORD;
BEGIN
  -- Process when status changes to 'ativo' (was 'aprovado' before - wrong!)
  IF NEW.status = 'ativo' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status != 'ativo') THEN
    
    -- Check if production orders already exist
    IF EXISTS (SELECT 1 FROM production_orders WHERE order_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    -- Get client name
    SELECT name INTO v_client_name FROM clients WHERE id = NEW.client_id;

    -- Iterate items grouped by centro_custo
    FOR v_item IN 
      SELECT DISTINCT centro_custo 
      FROM order_items 
      WHERE order_id = NEW.id AND centro_custo IS NOT NULL AND centro_custo != ''
    LOOP
      -- Match production_type by name
      SELECT id, name INTO v_production_type_id, v_production_type_name
      FROM production_types 
      WHERE active = true 
        AND (
          name ILIKE '%' || v_item.centro_custo || '%'
          OR v_item.centro_custo ILIKE '%' || name || '%'
        )
      LIMIT 1;

      -- Fallback: legacy centro_custo mapping
      IF v_production_type_id IS NULL AND NEW.centro_custo IS NOT NULL THEN
        CASE NEW.centro_custo
          WHEN 'moveis_planejados' THEN
            SELECT id, name INTO v_production_type_id, v_production_type_name
            FROM production_types WHERE name ILIKE '%planejados%' AND active = true LIMIT 1;
          WHEN 'producao_tendenci' THEN
            SELECT id, name INTO v_production_type_id, v_production_type_name
            FROM production_types WHERE name ILIKE '%tendenci%' AND active = true LIMIT 1;
          WHEN 'revenda' THEN
            SELECT id, name INTO v_production_type_id, v_production_type_name
            FROM production_types WHERE name ILIKE '%revenda%' AND active = true LIMIT 1;
          ELSE NULL;
        END CASE;
      END IF;

      IF v_production_type_id IS NULL THEN
        CONTINUE;
      END IF;

      -- Get initial phase
      SELECT id INTO v_start_phase_id
      FROM production_phase_templates
      WHERE production_type_id = v_production_type_id AND is_initial = true
      ORDER BY position LIMIT 1;

      IF v_start_phase_id IS NULL THEN
        SELECT id INTO v_start_phase_id
        FROM production_phase_templates
        WHERE production_type_id = v_production_type_id
        ORDER BY position LIMIT 1;
      END IF;

      IF v_start_phase_id IS NULL THEN
        CONTINUE;
      END IF;

      -- Create production order
      INSERT INTO production_orders (
        order_id, production_type_id, current_phase_id,
        client_name, status, priority
      ) VALUES (
        NEW.id, v_production_type_id, v_start_phase_id,
        COALESCE(v_client_name, 'Cliente'), 'em_andamento', 'normal'
      ) RETURNING id INTO v_new_op_id;

    END LOOP;

    -- Update order status to em_producao if production orders were created
    IF EXISTS (SELECT 1 FROM production_orders WHERE order_id = NEW.id) THEN
      NEW.status := 'em_producao';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix financial edit trigger to also handle the initial activation (rascunho→ativo)
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
BEGIN
  -- For INSERT: only run if status is ativo/faturado
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('ativo', 'faturado', 'em_producao') THEN
      RETURN NEW;
    END IF;
  END IF;

  -- For UPDATE: run when order becomes active OR when already-active order is edited
  IF TG_OP = 'UPDATE' THEN
    IF NOT (
      -- Already active and being edited
      (NEW.status IN ('ativo', 'faturado', 'em_producao') AND OLD.status IN ('ativo', 'faturado', 'em_producao'))
      -- Just became active from draft
      OR (NEW.status IN ('ativo', 'faturado', 'em_producao') AND OLD.status IN ('rascunho'))
    ) THEN
      RETURN NEW;
    END IF;
    
    -- For already-active edits, check if financial fields changed
    IF OLD.status IN ('ativo', 'faturado', 'em_producao') AND NEW.status IN ('ativo', 'faturado', 'em_producao') THEN
      IF NEW.valor_total IS NOT DISTINCT FROM OLD.valor_total
        AND NEW.taxa_cartao_valor IS NOT DISTINCT FROM OLD.taxa_cartao_valor
        AND NEW.taxa_cartao_responsavel IS NOT DISTINCT FROM OLD.taxa_cartao_responsavel
        AND NEW.taxa_boleto_valor IS NOT DISTINCT FROM OLD.taxa_boleto_valor
        AND NEW.taxa_boleto_responsavel IS NOT DISTINCT FROM OLD.taxa_boleto_responsavel
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
  IF NEW.centro_custo IS NOT NULL AND NEW.centro_custo <> '' THEN
    SELECT id INTO v_cost_center_id FROM public.fin_cost_centers WHERE name = NEW.centro_custo LIMIT 1;
  END IF;

  -- Delete old entries
  DELETE FROM public.fin_payables WHERE document_number = v_doc_number;
  DELETE FROM public.fin_ledger_entries WHERE document_number = v_doc_number AND parent_entry_id IS NOT NULL;
  DELETE FROM public.fin_receivables WHERE order_id = NEW.id;
  DELETE FROM public.fin_ledger_entries WHERE document_number = v_doc_number AND parent_entry_id IS NULL;

  IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
    -- RECEITA PRINCIPAL
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

    INSERT INTO public.fin_receivables (
      order_id, customer_id, amount, due_date, competence_date,
      status, description, document_number, notes, ledger_entry_id, created_by,
      cost_center_id, project_id
    ) VALUES (
      NEW.id, NEW.client_id, NEW.valor_total,
      COALESCE(NEW.data_primeiro_vencimento::date, (NOW() + interval '30 days')::date),
      v_competence_date, 'ABERTO',
      'Pedido #' || NEW.order_number, v_doc_number,
      'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
      v_ledger_id, NEW.created_by, v_cost_center_id, NEW.project_id
    );

    -- Taxa Cartão
    IF COALESCE(NEW.taxa_cartao_responsavel, '') = 'tendenci' AND COALESCE(NEW.taxa_cartao_valor, 0) > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Taxa Cartão (' || COALESCE(NEW.taxa_cartao_percentual, 0) || '%)',
        NEW.taxa_cartao_valor, 'DESPESA', v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Taxa cartão do Pedido #' || NEW.order_number,
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id
      );
    END IF;

    -- Taxa Boleto
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

    -- RT
    IF COALESCE(NEW.rt_habilitado, false) = true AND COALESCE(NEW.rt_valor, 0) > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - RT (' || COALESCE(NEW.rt_percentual, 0) || '%)',
        NEW.rt_valor, 'DESPESA', v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Recurso Tendenci do Pedido #' || NEW.order_number,
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id
      );
    END IF;

    -- Comissão Vendedor
    IF COALESCE(NEW.comissao_vendedor_valor, 0) > 0 THEN
      v_responsible_name := NULL;
      IF NEW.comissao_vendedor_responsavel_id IS NOT NULL THEN
        SELECT name INTO v_responsible_name FROM order_responsibles WHERE id = NEW.comissao_vendedor_responsavel_id;
      END IF;
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Comissão Vendedor' || COALESCE(' (' || v_responsible_name || ')', ''),
        NEW.comissao_vendedor_valor, 'DESPESA', v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Comissão vendedor do Pedido #' || NEW.order_number || COALESCE(' - ' || v_responsible_name, ''),
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id
      ) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (
        amount, due_date, competence_date, status, description,
        document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id, order_id
      ) VALUES (
        NEW.comissao_vendedor_valor,
        (NOW() + interval '30 days')::date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Comissão Vendedor' || COALESCE(' (' || v_responsible_name || ')', ''),
        v_doc_number,
        'Comissão vendedor do Pedido #' || NEW.order_number || COALESCE(' - ' || v_responsible_name, ''),
        v_expense_ledger_id, NEW.created_by, v_cost_center_id, NEW.project_id, NEW.id
      );
    END IF;

    -- Comissão Orçamentista
    IF COALESCE(NEW.comissao_orcamentista_valor, 0) > 0 THEN
      v_responsible_name := NULL;
      IF NEW.comissao_orcamentista_responsavel_id IS NOT NULL THEN
        SELECT name INTO v_responsible_name FROM order_responsibles WHERE id = NEW.comissao_orcamentista_responsavel_id;
      END IF;
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Comissão Orçamentista' || COALESCE(' (' || v_responsible_name || ')', ''),
        NEW.comissao_orcamentista_valor, 'DESPESA', v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Comissão orçamentista do Pedido #' || NEW.order_number || COALESCE(' - ' || v_responsible_name, ''),
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id
      ) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (
        amount, due_date, competence_date, status, description,
        document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id, order_id
      ) VALUES (
        NEW.comissao_orcamentista_valor,
        (NOW() + interval '30 days')::date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Comissão Orçamentista' || COALESCE(' (' || v_responsible_name || ')', ''),
        v_doc_number,
        'Comissão orçamentista do Pedido #' || NEW.order_number || COALESCE(' - ' || v_responsible_name, ''),
        v_expense_ledger_id, NEW.created_by, v_cost_center_id, NEW.project_id, NEW.id
      );
    END IF;

    -- Comissão Projetista
    IF COALESCE(NEW.comissao_projetista_valor, 0) > 0 THEN
      v_responsible_name := NULL;
      IF NEW.comissao_projetista_responsavel_id IS NOT NULL THEN
        SELECT name INTO v_responsible_name FROM order_responsibles WHERE id = NEW.comissao_projetista_responsavel_id;
      END IF;
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Comissão Projetista' || COALESCE(' (' || v_responsible_name || ')', ''),
        NEW.comissao_projetista_valor, 'DESPESA', v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Comissão projetista do Pedido #' || NEW.order_number || COALESCE(' - ' || v_responsible_name, ''),
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id
      ) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (
        amount, due_date, competence_date, status, description,
        document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id, order_id
      ) VALUES (
        NEW.comissao_projetista_valor,
        (NOW() + interval '30 days')::date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Comissão Projetista' || COALESCE(' (' || v_responsible_name || ')', ''),
        v_doc_number,
        'Comissão projetista do Pedido #' || NEW.order_number || COALESCE(' - ' || v_responsible_name, ''),
        v_expense_ledger_id, NEW.created_by, v_cost_center_id, NEW.project_id, NEW.id
      );
    END IF;

    -- Comissão Montador
    IF COALESCE(NEW.comissao_montador_valor, 0) > 0 THEN
      v_responsible_name := NULL;
      IF NEW.comissao_montador_responsavel_id IS NOT NULL THEN
        SELECT name INTO v_responsible_name FROM order_responsibles WHERE id = NEW.comissao_montador_responsavel_id;
      END IF;
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, document_number,
        party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, parent_entry_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Comissão Montador (' || COALESCE(NEW.comissao_montador_percentual, 0) || '%)',
        ROUND(NEW.comissao_montador_valor::numeric, 2), 'DESPESA', v_competence_date, v_doc_number,
        NEW.client_id, 'client', 'ABERTO',
        'Comissão montador do Pedido #' || NEW.order_number || COALESCE(' - ' || v_responsible_name, ''),
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id
      ) RETURNING id INTO v_expense_ledger_id;
      INSERT INTO public.fin_payables (
        amount, due_date, competence_date, status, description,
        document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id, order_id
      ) VALUES (
        ROUND(NEW.comissao_montador_valor::numeric, 2),
        (NOW() + interval '30 days')::date, v_competence_date, 'ABERTO',
        'PED #' || NEW.order_number || ' - Comissão Montador' || COALESCE(' (' || v_responsible_name || ')', ''),
        v_doc_number,
        'Comissão montador do Pedido #' || NEW.order_number || COALESCE(' - ' || v_responsible_name, ''),
        v_expense_ledger_id, NEW.created_by, v_cost_center_id, NEW.project_id, NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Also update receivable trigger to handle em_producao status
CREATE OR REPLACE FUNCTION public.create_receivable_from_order()
RETURNS TRIGGER AS $$
DECLARE
  v_ledger_id uuid;
BEGIN
  IF (
    (TG_OP = 'INSERT' AND NEW.status IN ('ativo', 'faturado', 'em_producao'))
    OR 
    (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status 
      AND NEW.status IN ('ativo', 'faturado', 'em_producao')
      AND (OLD.status NOT IN ('ativo', 'faturado', 'em_producao') OR OLD.status IS NULL))
  ) THEN
    IF EXISTS (SELECT 1 FROM public.fin_receivables WHERE order_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date,
        document_number, party_id, party_type, status, notes, created_by
      ) VALUES (
        'Pedido #' || NEW.order_number,
        NEW.valor_total, 'RECEITA',
        COALESCE(NEW.data_emissao::date, NOW()::date), NULL,
        'PED-' || NEW.order_number::text, NEW.client_id, 'client',
        'ABERTO', 'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
        NEW.created_by
      ) RETURNING id INTO v_ledger_id;
      INSERT INTO public.fin_receivables (
        order_id, customer_id, amount, due_date, competence_date,
        status, description, document_number, notes, ledger_entry_id, created_by
      ) VALUES (
        NEW.id, NEW.client_id, NEW.valor_total,
        COALESCE(NEW.data_primeiro_vencimento::date, (NOW() + interval '30 days')::date),
        COALESCE(NEW.data_emissao::date, NOW()::date), 'ABERTO',
        'Pedido #' || NEW.order_number, 'PED-' || NEW.order_number::text,
        'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
        v_ledger_id, NEW.created_by
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
