-- 1) Corrige referências a colunas inexistentes (data_pedido/data_entrega) que
--    estavam quebrando qualquer UPDATE em public.orders.
CREATE OR REPLACE FUNCTION public.update_financial_entries_on_order_edit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('ativo','faturado','em_producao') THEN RETURN NEW; END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS NOT DISTINCT FROM NEW.status
       AND OLD.valor_total IS NOT DISTINCT FROM NEW.valor_total
       AND OLD.taxa_cartao_valor IS NOT DISTINCT FROM NEW.taxa_cartao_valor
       AND OLD.taxa_boleto_valor IS NOT DISTINCT FROM NEW.taxa_boleto_valor
       AND OLD.taxa_link_valor   IS NOT DISTINCT FROM NEW.taxa_link_valor
       AND OLD.project_id IS NOT DISTINCT FROM NEW.project_id
    THEN RETURN NEW; END IF;
  END IF;

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

  v_competence_date := COALESCE(NEW.data_emissao::date, CURRENT_DATE);
  v_first_due_date  := COALESCE(NEW.data_entrega_prevista::date, v_competence_date + 30);
  v_doc_number := 'PED-' || COALESCE(NEW.order_number::text, NEW.id::text);

  SELECT name INTO v_client_name FROM public.clients WHERE id = NEW.client_id;
  SELECT name INTO v_responsible_name FROM public.order_responsibles WHERE id = NEW.vendedor_id;

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

  SELECT id INTO v_chart_3_2 FROM public.fin_chart_accounts
    WHERE code = '3.2' AND tenant_id = NEW.tenant_id LIMIT 1;

  IF NEW.taxa_cartao_valor IS NOT NULL AND NEW.taxa_cartao_valor > 0 THEN
    INSERT INTO public.fin_ledger_entries (
      description, amount, type, competence_date, cash_date, status,
      cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id
    ) VALUES (
      'PED #' || NEW.order_number || ' - Taxa Cartão',
      NEW.taxa_cartao_valor, 'DESPESA',
      v_competence_date, NULL, 'ABERTO',
      v_cost_center_id, NEW.project_id, v_chart_3_2,
      NEW.tenant_id, NEW.id, NEW.client_id
    );
  END IF;

  IF NEW.taxa_boleto_valor IS NOT NULL AND NEW.taxa_boleto_valor > 0 THEN
    INSERT INTO public.fin_ledger_entries (
      description, amount, type, competence_date, cash_date, status,
      cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id
    ) VALUES (
      'Taxa Boleto Pedido #' || NEW.order_number,
      NEW.taxa_boleto_valor, 'DESPESA',
      v_competence_date, NULL, 'ABERTO',
      v_cost_center_id, NEW.project_id, v_chart_3_2,
      NEW.tenant_id, NEW.id, NEW.client_id
    );
  END IF;

  IF NEW.taxa_link_valor IS NOT NULL AND NEW.taxa_link_valor > 0 THEN
    INSERT INTO public.fin_ledger_entries (
      description, amount, type, competence_date, cash_date, status,
      cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id
    ) VALUES (
      'PED #' || NEW.order_number || ' - Taxa Link',
      NEW.taxa_link_valor, 'DESPESA',
      v_competence_date, NULL, 'ABERTO',
      v_cost_center_id, NEW.project_id, v_chart_3_2,
      NEW.tenant_id, NEW.id, NEW.client_id
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Corrige duplicação da comissão de produção (2.2.3 + 2.2.4)
CREATE OR REPLACE FUNCTION public.sync_all_commitments_from_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total numeric;
  r RECORD;
  v_pct numeric;
  v_resp uuid;
  v_selected boolean;
  v_default_pct numeric;
  v_producao_count int;
  v_share numeric;
BEGIN
  IF NEW.tenant_id IS NULL THEN RETURN NEW; END IF;
  v_total := COALESCE(NEW.valor_total, 0);

  SELECT COUNT(*) INTO v_producao_count
    FROM public.fin_chart_accounts ca
   WHERE ca.tenant_id = NEW.tenant_id
     AND ca.code LIKE '2.2.%'
     AND (LOWER(ca.name) LIKE '%produ%' OR ca.code IN ('2.2.3','2.2.4'));
  IF v_producao_count < 1 THEN v_producao_count := 1; END IF;

  FOR r IN
    SELECT ca.id AS chart_account_id, ca.code, ca.name,
           COALESCE(sc.default_percentage, 0) AS default_pct
      FROM public.fin_chart_accounts ca
      LEFT JOIN public.fin_strategic_resource_account_configs sc
        ON sc.chart_account_id = ca.id AND sc.tenant_id = NEW.tenant_id
     WHERE ca.tenant_id = NEW.tenant_id
       AND ca.code LIKE '2.2.%'
  LOOP
    v_pct := NULL; v_resp := NULL; v_selected := false;
    v_default_pct := r.default_pct; v_share := 1.0;

    IF r.code = '2.2.1' OR LOWER(r.name) LIKE '%vendedor%' THEN
      v_resp := NEW.comissao_vendedor_responsavel_id;
      v_pct  := NULLIF(NEW.comissao_vendedor_percentual, 0);
      v_selected := (v_pct IS NOT NULL OR v_resp IS NOT NULL);
    ELSIF r.code = '2.2.2' OR LOWER(r.name) LIKE '%or%amentista%' OR LOWER(r.name) LIKE '%projetista%' THEN
      v_resp := NEW.comissao_orcamentista_responsavel_id;
      v_pct  := NULLIF(NEW.comissao_orcamentista_percentual, 0);
      v_selected := (v_pct IS NOT NULL OR v_resp IS NOT NULL);
    ELSIF r.code = '2.2.6' OR LOWER(r.name) LIKE '%rt%' OR LOWER(r.name) LIKE '%parceiro%' THEN
      v_resp := NEW.rt_responsavel_id;
      v_pct  := NULLIF(NEW.rt_percentual, 0);
      v_selected := COALESCE(NEW.rt_habilitado, false) AND (v_pct IS NOT NULL OR v_resp IS NOT NULL);
    ELSIF r.code = '2.2.5' OR LOWER(r.name) LIKE '%montador%' THEN
      v_resp := NEW.comissao_montador_responsavel_id;
      v_pct  := NULLIF(NEW.comissao_montador_percentual, 0);
      v_selected := COALESCE(NEW.requer_montagem, false)
                    AND (v_pct IS NOT NULL OR v_resp IS NOT NULL);
    ELSIF LOWER(r.name) LIKE '%produ%' OR r.code IN ('2.2.3','2.2.4') THEN
      v_resp := NEW.comissao_producao_responsavel_id;
      v_pct  := NULLIF(NEW.comissao_producao_percentual, 0);
      v_selected := (v_pct IS NOT NULL OR v_resp IS NOT NULL);
      v_share := 1.0 / v_producao_count;
    ELSE CONTINUE; END IF;

    IF v_selected THEN
      INSERT INTO public.order_strategic_commitments (
        tenant_id, order_id, chart_account_id, percentual, valor, habilitado, responsavel_id
      ) VALUES (
        NEW.tenant_id, NEW.id, r.chart_account_id,
        ROUND(COALESCE(v_pct, v_default_pct) * v_share, 4),
        ROUND(v_total * (COALESCE(v_pct, v_default_pct) / 100.0) * v_share, 2),
        true, v_resp
      )
      ON CONFLICT (order_id, chart_account_id) DO UPDATE
         SET habilitado = true,
             percentual = EXCLUDED.percentual,
             valor = EXCLUDED.valor,
             responsavel_id = COALESCE(EXCLUDED.responsavel_id, public.order_strategic_commitments.responsavel_id),
             updated_at = now();
    ELSE
      UPDATE public.order_strategic_commitments
         SET habilitado = false, updated_at = now()
       WHERE order_id = NEW.id AND chart_account_id = r.chart_account_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- 3) Reaplicar para pedidos com comissão de produção configurada
DO $$
DECLARE o RECORD; BEGIN
  FOR o IN SELECT id FROM public.orders WHERE COALESCE(comissao_producao_valor,0) > 0 LOOP
    UPDATE public.orders SET updated_at = now() WHERE id = o.id;
  END LOOP;
END $$;