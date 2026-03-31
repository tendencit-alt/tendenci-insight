
-- Update commission/tax ledger trigger to include chart_account_id and cost_center_id
-- First find the trigger that creates commission entries
CREATE OR REPLACE FUNCTION public.create_order_commission_entries()
RETURNS TRIGGER AS $$
DECLARE
  v_cost_center_id uuid;
  v_centro_custo_name text;
  v_chart_account_id uuid;
BEGIN
  IF (
    (TG_OP = 'INSERT' AND NEW.status IN ('ativo', 'faturado', 'em_producao'))
    OR 
    (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status 
      AND NEW.status IN ('ativo', 'faturado', 'em_producao')
      AND (OLD.status NOT IN ('ativo', 'faturado', 'em_producao') OR OLD.status IS NULL))
  ) THEN
    -- Check if entries already exist
    IF EXISTS (SELECT 1 FROM public.fin_ledger_entries WHERE description LIKE 'PED #' || NEW.order_number || ' -%' AND type = 'DESPESA') THEN
      RETURN NEW;
    END IF;

    -- Get cost center from first order item
    SELECT oi.centro_custo INTO v_centro_custo_name
    FROM public.order_items oi WHERE oi.order_id = NEW.id LIMIT 1;

    IF v_centro_custo_name IS NOT NULL THEN
      SELECT id INTO v_cost_center_id FROM public.fin_cost_centers
      WHERE LOWER(name) = LOWER(v_centro_custo_name)
         OR LOWER(name) = LOWER(
           CASE v_centro_custo_name
             WHEN 'moveis_planejados' THEN 'Planejados'
             WHEN 'producao_tendenci' THEN 'Produção Tendenci'
             WHEN 'revenda' THEN 'Revenda'
             ELSE v_centro_custo_name
           END
         )
      LIMIT 1;
    END IF;

    -- Taxa Cartão
    IF NEW.taxa_cartao_valor IS NOT NULL AND NEW.taxa_cartao_valor > 0 THEN
      SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '3.2' LIMIT 1;
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, status, cost_center_id, project_id, chart_account_id)
      VALUES ('PED #' || NEW.order_number || ' - Taxa Cartão (' || ROUND(NEW.taxa_cartao_valor / NULLIF(NEW.valor_total,0) * 100, 2) || '%)',
        NEW.taxa_cartao_valor, 'DESPESA', COALESCE(NEW.data_emissao::date, NOW()::date), 'ABERTO', v_cost_center_id, NEW.project_id, v_chart_account_id);
    END IF;

    -- Taxa Boleto
    IF NEW.taxa_boleto_valor IS NOT NULL AND NEW.taxa_boleto_valor > 0 THEN
      SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '3.2' LIMIT 1;
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, status, cost_center_id, project_id, chart_account_id)
      VALUES ('PED #' || NEW.order_number || ' - Taxa Boleto',
        NEW.taxa_boleto_valor, 'DESPESA', COALESCE(NEW.data_emissao::date, NOW()::date), 'ABERTO', v_cost_center_id, NEW.project_id, v_chart_account_id);
    END IF;

    -- RT
    IF NEW.rt_valor IS NOT NULL AND NEW.rt_valor > 0 THEN
      SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '3.1.1' LIMIT 1;
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, status, cost_center_id, project_id, chart_account_id)
      VALUES ('PED #' || NEW.order_number || ' - RT (' || ROUND(NEW.rt_valor / NULLIF(NEW.valor_total,0) * 100, 2) || '%)',
        NEW.rt_valor, 'DESPESA', COALESCE(NEW.data_emissao::date, NOW()::date), 'ABERTO', v_cost_center_id, NEW.project_id, v_chart_account_id);
    END IF;

    -- Comissão Vendedor
    IF NEW.comissao_vendedor_valor IS NOT NULL AND NEW.comissao_vendedor_valor > 0 THEN
      SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '3.1.2' LIMIT 1;
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, status, cost_center_id, project_id, chart_account_id, notes)
      VALUES ('PED #' || NEW.order_number || ' - Comissão Vendedor' || COALESCE(' (' || (SELECT full_name FROM profiles WHERE id = NEW.vendedor_id) || ')', ''),
        NEW.comissao_vendedor_valor, 'DESPESA', COALESCE(NEW.data_emissao::date, NOW()::date), 'ABERTO', v_cost_center_id, NEW.project_id, v_chart_account_id,
        'Responsável: ' || COALESCE((SELECT full_name FROM profiles WHERE id = NEW.vendedor_id), 'N/A'));
    END IF;

    -- Comissão Orçamentista
    IF NEW.comissao_orcamentista_valor IS NOT NULL AND NEW.comissao_orcamentista_valor > 0 THEN
      SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '3.1.3' LIMIT 1;
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, status, cost_center_id, project_id, chart_account_id, notes)
      VALUES ('PED #' || NEW.order_number || ' - Comissão Orçamentista' || COALESCE(' (' || (SELECT full_name FROM profiles WHERE id = NEW.orcamentista_id) || ')', ''),
        NEW.comissao_orcamentista_valor, 'DESPESA', COALESCE(NEW.data_emissao::date, NOW()::date), 'ABERTO', v_cost_center_id, NEW.project_id, v_chart_account_id,
        'Responsável: ' || COALESCE((SELECT full_name FROM profiles WHERE id = NEW.orcamentista_id), 'N/A'));
    END IF;

    -- Comissão Projetista
    IF NEW.comissao_projetista_valor IS NOT NULL AND NEW.comissao_projetista_valor > 0 THEN
      SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '3.1.4' LIMIT 1;
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, status, cost_center_id, project_id, chart_account_id, notes)
      VALUES ('PED #' || NEW.order_number || ' - Comissão Projetista' || COALESCE(' (' || (SELECT full_name FROM profiles WHERE id = NEW.projetista_id) || ')', ''),
        NEW.comissao_projetista_valor, 'DESPESA', COALESCE(NEW.data_emissao::date, NOW()::date), 'ABERTO', v_cost_center_id, NEW.project_id, v_chart_account_id,
        'Responsável: ' || COALESCE((SELECT full_name FROM profiles WHERE id = NEW.projetista_id), 'N/A'));
    END IF;

    -- Comissão Montador
    IF NEW.comissao_montador_valor IS NOT NULL AND NEW.comissao_montador_valor > 0 THEN
      SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '3.1.5' LIMIT 1;
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, status, cost_center_id, project_id, chart_account_id)
      VALUES ('PED #' || NEW.order_number || ' - Comissão Montador (' || ROUND(NEW.comissao_montador_valor / NULLIF(NEW.valor_total,0) * 100, 0) || '%)',
        NEW.comissao_montador_valor, 'DESPESA', COALESCE(NEW.data_emissao::date, NOW()::date), 'ABERTO', v_cost_center_id, NEW.project_id, v_chart_account_id);
    END IF;

    -- Comissão Produção
    IF NEW.comissao_producao_valor IS NOT NULL AND NEW.comissao_producao_valor > 0 THEN
      SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '3.1.5' LIMIT 1;
      INSERT INTO public.fin_ledger_entries (description, amount, type, competence_date, status, cost_center_id, project_id, chart_account_id)
      VALUES ('PED #' || NEW.order_number || ' - Comissão Produção',
        NEW.comissao_producao_valor, 'DESPESA', COALESCE(NEW.data_emissao::date, NOW()::date), 'ABERTO', v_cost_center_id, NEW.project_id, v_chart_account_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update receivable trigger to include chart_account_id
CREATE OR REPLACE FUNCTION public.create_receivable_from_order()
RETURNS TRIGGER AS $$
DECLARE
  v_ledger_id uuid;
  v_cost_center_id uuid;
  v_centro_custo_name text;
  v_chart_account_id uuid;
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

    -- Get centro_custo from first order item
    SELECT oi.centro_custo INTO v_centro_custo_name
    FROM public.order_items oi WHERE oi.order_id = NEW.id LIMIT 1;

    IF v_centro_custo_name IS NOT NULL THEN
      SELECT id INTO v_cost_center_id FROM public.fin_cost_centers
      WHERE LOWER(name) = LOWER(v_centro_custo_name)
         OR LOWER(name) = LOWER(
           CASE v_centro_custo_name
             WHEN 'moveis_planejados' THEN 'Planejados'
             WHEN 'producao_tendenci' THEN 'Produção Tendenci'
             WHEN 'revenda' THEN 'Revenda'
             ELSE v_centro_custo_name
           END
         )
      LIMIT 1;
    END IF;

    -- Get chart account for revenue
    SELECT id INTO v_chart_account_id FROM public.fin_chart_accounts WHERE code = '1' LIMIT 1;

    IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date,
        document_number, party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, chart_account_id
      ) VALUES (
        'Pedido #' || NEW.order_number || ' - Receita',
        NEW.valor_total, 'RECEITA',
        COALESCE(NEW.data_emissao::date, NOW()::date), NULL,
        'PED-' || NEW.order_number::text, NEW.client_id, 'client',
        'ABERTO', 'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
        NEW.created_by, v_cost_center_id, NEW.project_id, v_chart_account_id
      ) RETURNING id INTO v_ledger_id;

      INSERT INTO public.fin_receivables (
        order_id, customer_id, amount, due_date, competence_date,
        status, description, document_number, notes, ledger_entry_id, created_by,
        cost_center_id, project_id, chart_account_id
      ) VALUES (
        NEW.id, NEW.client_id, NEW.valor_total,
        COALESCE(NEW.data_primeiro_vencimento::date, (NOW() + interval '30 days')::date),
        COALESCE(NEW.data_emissao::date, NOW()::date), 'ABERTO',
        'Pedido #' || NEW.order_number, 'PED-' || NEW.order_number::text,
        'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
        v_ledger_id, NEW.created_by, v_cost_center_id, NEW.project_id, v_chart_account_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
