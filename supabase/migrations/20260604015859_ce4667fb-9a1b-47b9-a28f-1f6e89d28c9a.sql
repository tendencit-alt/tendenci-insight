CREATE OR REPLACE FUNCTION public.update_financial_entries_on_order_edit()
RETURNS TRIGGER AS $$
DECLARE
  v_competence_date date;
  v_first_due_date  date;
  v_doc_number      text;
  v_client_name     text;
  v_cost_center_id  uuid;
  v_chart_receita   uuid;
  v_chart_3_2       uuid;
  v_num_parcelas    integer;
  v_valor_parcela   numeric;
  v_current_due     date;
  v_centro_custo_name text;
  v_parcelas_json   jsonb;
  v_parcela_item    jsonb;
  v_i               integer := 0;
  v_ledger_id       uuid;
BEGIN
  -- Verificar se houve mudança relevante para evitar processamento desnecessário
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS NOT DISTINCT FROM NEW.status
       AND OLD.valor_total IS NOT DISTINCT FROM NEW.valor_total
       AND OLD.parcelas IS NOT DISTINCT FROM NEW.parcelas
       AND OLD.data_primeiro_vencimento IS NOT DISTINCT FROM NEW.data_primeiro_vencimento
       AND OLD.observacao_pagamento IS NOT DISTINCT FROM NEW.observacao_pagamento
       AND OLD.taxa_cartao_valor IS NOT DISTINCT FROM NEW.taxa_cartao_valor
       AND OLD.taxa_boleto_valor IS NOT DISTINCT FROM NEW.taxa_boleto_valor
       AND OLD.taxa_link_valor   IS NOT DISTINCT FROM NEW.taxa_link_valor
       AND OLD.project_id IS NOT DISTINCT FROM NEW.project_id
       AND OLD.client_id IS NOT DISTINCT FROM NEW.client_id
    THEN RETURN NEW; END IF;
  END IF;

  -- Limpar entradas anteriores geradas por este pedido (exceto compromissos estratégicos)
  DELETE FROM public.fin_payables
    WHERE ledger_entry_id IN (
      SELECT id FROM public.fin_ledger_entries
      WHERE order_id = NEW.id AND COALESCE(origem,'') <> 'order_strategic_commitment'
    );
  DELETE FROM public.fin_receivables WHERE order_id = NEW.id;
  DELETE FROM public.fin_ledger_entries
    WHERE order_id = NEW.id AND COALESCE(origem,'') <> 'order_strategic_commitment';

  -- Só gera financeiro para pedidos em estados válidos
  IF NEW.status NOT IN ('ativo','faturado','em_producao','aprovado') THEN
    RETURN NEW;
  END IF;

  v_competence_date := COALESCE(NEW.data_emissao::date, CURRENT_DATE);
  v_doc_number := 'PED-' || COALESCE(NEW.order_number::text, NEW.id::text);

  SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;
  
  -- Buscar centro de custo
  SELECT oi.centro_custo INTO v_centro_custo_name
    FROM public.order_items oi WHERE oi.order_id = NEW.id LIMIT 1;
  IF v_centro_custo_name IS NULL THEN v_centro_custo_name := NEW.centro_custo; END IF;
  
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

  -- Buscar conta de receita (vendas)
  SELECT id INTO v_chart_receita FROM public.fin_chart_accounts
    WHERE (code = '1.1' OR LOWER(name) LIKE '%venda%') AND tenant_id = NEW.tenant_id AND type = 'RECEITA' 
    ORDER BY code ASC LIMIT 1;

  -- Buscar conta de taxas (3.2)
  SELECT id INTO v_chart_3_2 FROM public.fin_chart_accounts
    WHERE code = '3.2' AND tenant_id = NEW.tenant_id LIMIT 1;

  -- Tentar processar parcelas via JSON em observacao_pagamento
  BEGIN
    v_parcelas_json := NEW.observacao_pagamento::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_parcelas_json := NULL;
  END;

  IF v_parcelas_json IS NOT NULL AND jsonb_typeof(v_parcelas_json) = 'array' AND jsonb_array_length(v_parcelas_json) > 0 THEN
    -- Lógica via JSON detalhado
    v_num_parcelas := jsonb_array_length(v_parcelas_json);
    FOR v_parcela_item IN SELECT * FROM jsonb_array_elements(v_parcelas_json) LOOP
      v_i := v_i + 1;
      v_valor_parcela := (NEW.valor_total * COALESCE((v_parcela_item->>'percentual')::numeric, 0) / 100);
      
      -- Se o valor for muito pequeno por erro de arredondamento mas for a última parcela, ajusta? 
      -- Melhor não mexer por enquanto, a soma deve bater se os percentuais baterem.

      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, status,
        cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id, document_number,
        installment_number, total_installments
      ) VALUES (
        'Pedido #' || NEW.order_number || ' - ' || COALESCE(v_client_name, 'Cliente') || ' (' || v_i || '/' || v_num_parcelas || ')',
        v_valor_parcela, 'RECEITA',
        v_competence_date, 'ABERTO',
        v_cost_center_id, NEW.project_id, v_chart_receita,
        NEW.tenant_id, NEW.id, NEW.client_id, v_doc_number,
        v_i, v_num_parcelas
      ) RETURNING id INTO v_ledger_id;

      INSERT INTO public.fin_receivables (
        tenant_id, order_id, customer_id, amount, due_date, competence_date,
        description, status, ledger_entry_id, installment, total_installments,
        chart_account_id, cost_center_id, project_id, document_number
      ) VALUES (
        NEW.tenant_id, NEW.id, NEW.client_id, v_valor_parcela, 
        COALESCE((v_parcela_item->>'data_vencimento')::date, v_competence_date), 
        v_competence_date,
        'Receita Pedido #' || NEW.order_number || ' (' || v_i || '/' || v_num_parcelas || ')',
        'ABERTO', v_ledger_id, v_i, v_num_parcelas,
        v_chart_receita, v_cost_center_id, NEW.project_id, v_doc_number
      );
    END LOOP;
  ELSE
    -- Lógica fallback (parcelas iguais mensais)
    v_first_due_date  := COALESCE(NEW.data_primeiro_vencimento, v_competence_date);
    v_num_parcelas := COALESCE(NEW.parcelas, 1);
    IF v_num_parcelas < 1 THEN v_num_parcelas := 1; END IF;
    v_valor_parcela := NEW.valor_total / v_num_parcelas;

    IF NEW.valor_total > 0 THEN
      FOR i IN 1..v_num_parcelas LOOP
        v_current_due := v_first_due_date + ((i-1) * interval '1 month');
        
        INSERT INTO public.fin_ledger_entries (
          description, amount, type, competence_date, status,
          cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id, document_number,
          installment_number, total_installments
        ) VALUES (
          'Pedido #' || NEW.order_number || ' - ' || COALESCE(v_client_name, 'Cliente') || ' (' || i || '/' || v_num_parcelas || ')',
          v_valor_parcela, 'RECEITA',
          v_competence_date, 'ABERTO',
          v_cost_center_id, NEW.project_id, v_chart_receita,
          NEW.tenant_id, NEW.id, NEW.client_id, v_doc_number,
          i, v_num_parcelas
        ) RETURNING id INTO v_ledger_id;

        INSERT INTO public.fin_receivables (
          tenant_id, order_id, customer_id, amount, due_date, competence_date,
          description, status, ledger_entry_id, installment, total_installments,
          chart_account_id, cost_center_id, project_id, document_number
        ) VALUES (
          NEW.tenant_id, NEW.id, NEW.client_id, v_valor_parcela, v_current_due, v_competence_date,
          'Receita Pedido #' || NEW.order_number || ' (' || i || '/' || v_num_parcelas || ')',
          'ABERTO', v_ledger_id, i, v_num_parcelas,
          v_chart_receita, v_cost_center_id, NEW.project_id, v_doc_number
        );
      END LOOP;
    END IF;
  END IF;

  -- 2. Inserir Taxas como Despesas
  IF NEW.taxa_cartao_valor > 0 THEN
    INSERT INTO public.fin_ledger_entries (
      description, amount, type, competence_date, status,
      cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id
    ) VALUES (
      'PED #' || NEW.order_number || ' - Taxa Cartão',
      NEW.taxa_cartao_valor, 'DESPESA',
      v_competence_date, 'ABERTO',
      v_cost_center_id, NEW.project_id, v_chart_3_2,
      NEW.tenant_id, NEW.id, NEW.client_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Forçar reprocessamento para aplicar a nova lógica baseada em JSON
UPDATE public.orders SET updated_at = now() WHERE created_at >= '2026-04-01';
