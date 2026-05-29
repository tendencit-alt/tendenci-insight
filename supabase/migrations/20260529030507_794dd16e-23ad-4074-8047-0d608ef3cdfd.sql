
CREATE OR REPLACE FUNCTION public.sync_strategic_commitment_ledger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_cost_center_id uuid;
  v_centro_custo_name text;
  v_account_name text;
  v_doc text;
  v_ledger_id uuid;
  v_cfg_cc_id uuid;
  v_due date;
  v_supplier_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.fin_payables
      WHERE document_number = 'COMP-' || OLD.id::text
        AND origem = 'order_strategic_commitment'
        AND COALESCE(status,'ABERTO') = 'ABERTO';
    DELETE FROM public.fin_ledger_entries
      WHERE document_number = 'COMP-' || OLD.id::text
        AND status IN ('ABERTO','PROVISIONADO');
    RETURN OLD;
  END IF;

  v_doc := 'COMP-' || NEW.id::text;

  SELECT o.id, o.status, o.order_number, o.data_emissao, o.project_id, o.client_id, o.centro_custo, o.tenant_id,
         o.comissao_vendedor_responsavel_id, o.comissao_orcamentista_responsavel_id,
         o.comissao_projetista_responsavel_id, o.comissao_montador_responsavel_id,
         o.comissao_producao_responsavel_id, o.architect_id
    INTO v_order FROM public.orders o WHERE o.id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF NOT COALESCE(NEW.habilitado, false) OR COALESCE(NEW.valor, 0) <= 0 THEN
    DELETE FROM public.fin_payables
      WHERE document_number = v_doc AND origem = 'order_strategic_commitment'
        AND COALESCE(status,'ABERTO') = 'ABERTO';
    DELETE FROM public.fin_ledger_entries
      WHERE document_number = v_doc AND status IN ('ABERTO','PROVISIONADO');
    RETURN NEW;
  END IF;

  IF v_order.status::text NOT IN ('ativo','aprovado','faturado','em_producao') THEN
    RETURN NEW;
  END IF;

  SELECT oi.centro_custo INTO v_centro_custo_name
    FROM public.order_items oi WHERE oi.order_id = v_order.id LIMIT 1;
  IF v_centro_custo_name IS NULL THEN v_centro_custo_name := v_order.centro_custo; END IF;
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

  SELECT name INTO v_account_name FROM public.fin_chart_accounts WHERE id = NEW.chart_account_id;

  -- 1) Try the commitment's own responsavel
  IF NEW.responsavel_id IS NOT NULL THEN
    SELECT supplier_id INTO v_supplier_id FROM public.order_responsibles WHERE id = NEW.responsavel_id;
  END IF;

  -- 2) Fallback: match against the order's responsibles by chart_account_id
  IF v_supplier_id IS NULL THEN
    SELECT orr.supplier_id INTO v_supplier_id
      FROM public.order_responsibles orr
     WHERE orr.chart_account_id = NEW.chart_account_id
       AND orr.tenant_id = NEW.tenant_id
       AND orr.supplier_id IS NOT NULL
       AND orr.id = ANY (ARRAY[
         v_order.comissao_vendedor_responsavel_id,
         v_order.comissao_orcamentista_responsavel_id,
         v_order.comissao_projetista_responsavel_id,
         v_order.comissao_montador_responsavel_id,
         v_order.comissao_producao_responsavel_id,
         v_order.architect_id
       ]::uuid[])
     LIMIT 1;
  END IF;

  SELECT cost_center_id INTO v_cfg_cc_id
    FROM public.fin_strategic_resource_account_configs
   WHERE tenant_id = NEW.tenant_id AND chart_account_id = NEW.chart_account_id LIMIT 1;
  IF v_cfg_cc_id IS NULL THEN
    SELECT id INTO v_cfg_cc_id FROM public.fin_cost_centers
      WHERE tenant_id = NEW.tenant_id AND LOWER(name)='comercial' AND active=true LIMIT 1;
  END IF;

  IF EXISTS (SELECT 1 FROM public.fin_ledger_entries WHERE document_number = v_doc) THEN
    UPDATE public.fin_ledger_entries
    SET amount = NEW.valor,
        description = 'PED #' || v_order.order_number || ' - ' || COALESCE(v_account_name, 'Compromisso'),
        chart_account_id = NEW.chart_account_id,
        cost_center_id = v_cost_center_id,
        project_id = v_order.project_id,
        client_id = v_order.client_id,
        competence_date = COALESCE(v_order.data_emissao::date, NOW()::date),
        updated_at = now()
    WHERE document_number = v_doc AND status IN ('ABERTO','PROVISIONADO')
    RETURNING id INTO v_ledger_id;
  ELSE
    INSERT INTO public.fin_ledger_entries (
      description, amount, type, competence_date, cash_date, status,
      cost_center_id, project_id, chart_account_id, tenant_id,
      order_id, client_id, document_number, origem
    ) VALUES (
      'PED #' || v_order.order_number || ' - ' || COALESCE(v_account_name, 'Compromisso'),
      NEW.valor, 'DESPESA',
      COALESCE(v_order.data_emissao::date, NOW()::date), NULL, 'ABERTO',
      v_cost_center_id, v_order.project_id, NEW.chart_account_id, NEW.tenant_id,
      v_order.id, v_order.client_id, v_doc, 'order_strategic_commitment'
    ) RETURNING id INTO v_ledger_id;
  END IF;

  v_due := COALESCE(v_order.data_emissao::date, NOW()::date) + INTERVAL '30 days';

  IF EXISTS (SELECT 1 FROM public.fin_payables WHERE document_number = v_doc AND origem='order_strategic_commitment') THEN
    UPDATE public.fin_payables
       SET amount = NEW.valor,
           chart_account_id = NEW.chart_account_id,
           cost_center_id = v_cfg_cc_id,
           project_id = v_order.project_id,
           supplier_id = COALESCE(v_supplier_id, supplier_id),
           description = 'PED #' || v_order.order_number || ' - ' || COALESCE(v_account_name, 'Compromisso'),
           tenant_id = NEW.tenant_id,
           order_id = v_order.id,
           ledger_entry_id = v_ledger_id,
           updated_at = now()
     WHERE document_number = v_doc
       AND origem = 'order_strategic_commitment'
       AND COALESCE(status,'ABERTO') = 'ABERTO';
  ELSE
    INSERT INTO public.fin_payables (
      amount, due_date, competence_date, status, chart_account_id, cost_center_id,
      project_id, supplier_id, description, document_number, tenant_id, order_id,
      ledger_entry_id, origem
    ) VALUES (
      NEW.valor, v_due, COALESCE(v_order.data_emissao::date, NOW()::date), 'ABERTO',
      NEW.chart_account_id, v_cfg_cc_id, v_order.project_id, v_supplier_id,
      'PED #' || v_order.order_number || ' - ' || COALESCE(v_account_name, 'Compromisso'),
      v_doc, NEW.tenant_id, v_order.id, v_ledger_id, 'order_strategic_commitment'
    );
  END IF;

  RETURN NEW;
END $function$;

-- Backfill open payables by re-touching commitments to fire trigger
UPDATE public.order_strategic_commitments SET updated_at = now()
 WHERE id IN (
   SELECT osc.id FROM public.order_strategic_commitments osc
    JOIN public.fin_payables p ON p.document_number = 'COMP-' || osc.id::text
   WHERE p.origem = 'order_strategic_commitment'
     AND COALESCE(p.status,'ABERTO') = 'ABERTO'
     AND p.supplier_id IS NULL
 );
