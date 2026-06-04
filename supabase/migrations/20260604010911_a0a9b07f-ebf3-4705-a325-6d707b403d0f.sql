CREATE OR REPLACE FUNCTION public.update_financial_entries_on_order_edit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_competence_date date;
  v_first_due_date  date;
  v_doc_number      text;
  v_client_name     text;
  v_responsible_name text;
  v_centro_custo_name text;
  v_cost_center_id  uuid;
  v_chart_3_2       uuid;
  v_chart_receita   uuid;
BEGIN
  -- Verificar se houve mudança relevante para evitar processamento desnecessário
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS NOT DISTINCT FROM NEW.status
       AND OLD.valor_total IS NOT DISTINCT FROM NEW.valor_total
       AND OLD.taxa_cartao_valor IS NOT DISTINCT FROM NEW.taxa_cartao_valor
       AND OLD.taxa_boleto_valor IS NOT DISTINCT FROM NEW.taxa_boleto_valor
       AND OLD.taxa_link_valor   IS NOT DISTINCT FROM NEW.taxa_link_valor
       AND OLD.project_id IS NOT DISTINCT FROM NEW.project_id
       AND OLD.client_id IS NOT DISTINCT FROM NEW.client_id
    THEN RETURN NEW; END IF;
  END IF;

  -- Limpar entradas anteriores geradas por este pedido (exceto compromissos estratégicos)
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM public.fin_payables
      WHERE ledger_entry_id IN (
        SELECT id FROM public.fin_ledger_entries
        WHERE order_id = OLD.id AND COALESCE(origem,'') <> 'order_strategic_commitment'
      );
    DELETE FROM public.fin_receivables WHERE order_id = OLD.id;
    DELETE FROM public.fin_ledger_entries
      WHERE order_id = OLD.id AND COALESCE(origem,'') <> 'order_strategic_commitment';
  END IF;

  -- Só gera financeiro para pedidos em estados válidos
  IF NEW.status NOT IN ('ativo','faturado','em_producao','aprovado') THEN
    RETURN NEW;
  END IF;

  v_competence_date := COALESCE(NEW.data_emissao::date, CURRENT_DATE);
  v_first_due_date  := COALESCE(NEW.data_entrega_prevista::date, v_competence_date + 30);
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

  -- 1. Inserir Receita Principal
  IF NEW.valor_total > 0 THEN
    INSERT INTO public.fin_ledger_entries (
      description, amount, type, competence_date, status,
      cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id, document_number
    ) VALUES (
      'Pedido #' || NEW.order_number || ' - ' || COALESCE(v_client_name, 'Cliente'),
      NEW.valor_total, 'RECEITA',
      v_competence_date, 'ABERTO',
      v_cost_center_id, NEW.project_id, v_chart_receita,
      NEW.tenant_id, NEW.id, NEW.client_id, v_doc_number
    );
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

  IF NEW.taxa_boleto_valor > 0 THEN
    INSERT INTO public.fin_ledger_entries (
      description, amount, type, competence_date, status,
      cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id
    ) VALUES (
      'Taxa Boleto Pedido #' || NEW.order_number,
      NEW.taxa_boleto_valor, 'DESPESA',
      v_competence_date, 'ABERTO',
      v_cost_center_id, NEW.project_id, v_chart_3_2,
      NEW.tenant_id, NEW.id, NEW.client_id
    );
  END IF;

  IF NEW.taxa_link_valor > 0 THEN
    INSERT INTO public.fin_ledger_entries (
      description, amount, type, competence_date, status,
      cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id
    ) VALUES (
      'PED #' || NEW.order_number || ' - Taxa Link',
      NEW.taxa_link_valor, 'DESPESA',
      v_competence_date, 'ABERTO',
      v_cost_center_id, NEW.project_id, v_chart_3_2,
      NEW.tenant_id, NEW.id, NEW.client_id
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Executar backfill para pedidos ativos que não possuem entrada no ledger
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT * FROM public.orders 
    WHERE status IN ('ativo','faturado','em_producao','aprovado')
    AND id NOT IN (SELECT order_id FROM public.fin_ledger_entries WHERE order_id IS NOT NULL AND COALESCE(origem,'') <> 'order_strategic_commitment')
  LOOP
    -- Simula um update para disparar o trigger
    UPDATE public.orders SET updated_at = now() WHERE id = r.id;
  END LOOP;
END $$;