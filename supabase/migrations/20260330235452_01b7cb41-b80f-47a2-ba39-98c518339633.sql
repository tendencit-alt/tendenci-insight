
-- =============================================
-- FIX 1: Auto-activate orders on INSERT
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_activate_order_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'rascunho' THEN
    IF NEW.client_id IS NOT NULL 
       AND NEW.forma_pagamento IS NOT NULL 
       AND NEW.forma_pagamento != ''
       AND NEW.valor_total IS NOT NULL 
       AND NEW.valor_total > 0 THEN
      NEW.status := 'ativo';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_auto_activate_order ON public.orders;
CREATE TRIGGER trigger_auto_activate_order
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_activate_order_on_insert();

-- =============================================
-- FIX 2: Receivable trigger handles INSERT + UPDATE
-- =============================================
CREATE OR REPLACE FUNCTION public.create_receivable_from_order()
RETURNS TRIGGER AS $$
DECLARE
  v_ledger_id uuid;
BEGIN
  IF (
    (TG_OP = 'INSERT' AND NEW.status IN ('ativo', 'faturado'))
    OR 
    (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status 
      AND NEW.status IN ('ativo', 'faturado')
      AND (OLD.status NOT IN ('ativo', 'faturado') OR OLD.status IS NULL))
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
        'PENDENTE', 'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
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

DROP TRIGGER IF EXISTS trigger_create_receivable_from_order ON public.orders;
CREATE TRIGGER trigger_create_receivable_from_order
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_receivable_from_order();

-- =============================================
-- FIX 3: Fix update_financial_entries_on_order_edit - supplier_id FK issue
-- Commission responsibles come from order_responsibles, not suppliers.
-- Set supplier_id to NULL and put responsible name in description.
-- Also support INSERT + UPDATE.
-- =============================================
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
    IF NEW.status NOT IN ('ativo', 'faturado') THEN
      RETURN NEW;
    END IF;
  END IF;

  -- For UPDATE: only run when an already-approved order is updated
  IF TG_OP = 'UPDATE' THEN
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
  END IF;

  v_doc_number := 'PED-' || NEW.order_number::text;
  v_competence_date := COALESCE(NEW.data_emissao::date, NOW()::date);

  -- Resolve cost_center_id
  v_cost_center_id := NULL;
  IF NEW.centro_custo IS NOT NULL AND NEW.centro_custo <> '' THEN
    SELECT id INTO v_cost_center_id FROM public.fin_cost_centers WHERE name = NEW.centro_custo LIMIT 1;
  END IF;

  -- Delete old entries (safe for INSERT since nothing exists yet)
  DELETE FROM public.fin_payables WHERE document_number = v_doc_number;
  DELETE FROM public.fin_ledger_entries WHERE document_number = v_doc_number AND parent_entry_id IS NOT NULL;
  DELETE FROM public.fin_receivables WHERE order_id = NEW.id;
  DELETE FROM public.fin_ledger_entries WHERE document_number = v_doc_number AND parent_entry_id IS NULL;

  -- Recreate
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
      'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
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
        'Taxa cartão do Pedido #' || NEW.order_number,
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
        'Recurso Tendenci do Pedido #' || NEW.order_number,
        NEW.created_by, v_cost_center_id, NEW.project_id, v_ledger_id
      );
    END IF;

    -- 5. Comissão Vendedor (supplier_id = NULL, responsible name in description)
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
        v_expense_ledger_id, NEW.created_by,
        v_cost_center_id, NEW.project_id, NEW.id
      );
    END IF;

    -- 6. Comissão Orçamentista
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
        v_expense_ledger_id, NEW.created_by,
        v_cost_center_id, NEW.project_id, NEW.id
      );
    END IF;

    -- 7. Comissão Projetista
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
        v_expense_ledger_id, NEW.created_by,
        v_cost_center_id, NEW.project_id, NEW.id
      );
    END IF;

    -- 8. Comissão Montador
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
        v_expense_ledger_id, NEW.created_by,
        v_cost_center_id, NEW.project_id, NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Update trigger to fire on INSERT + UPDATE
DROP TRIGGER IF EXISTS trg_update_financial_on_order_edit ON public.orders;
CREATE TRIGGER trg_update_financial_on_order_edit
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_financial_entries_on_order_edit();

-- =============================================
-- FIX 4: Production trigger also on INSERT
-- =============================================
DROP TRIGGER IF EXISTS trigger_create_production_on_order_approval ON public.orders;
CREATE TRIGGER trigger_create_production_on_order_approval
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_production_on_order_approval();
