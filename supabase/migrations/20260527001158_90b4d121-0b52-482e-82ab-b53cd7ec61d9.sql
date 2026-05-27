
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
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.fin_ledger_entries
    WHERE document_number = 'COMP-' || OLD.id::text
      AND status IN ('ABERTO','PROVISIONADO');
    RETURN OLD;
  END IF;

  v_doc := 'COMP-' || NEW.id::text;

  SELECT id, status, order_number, data_emissao, project_id, client_id, centro_custo, tenant_id
    INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF NOT COALESCE(NEW.habilitado, false) OR COALESCE(NEW.valor, 0) <= 0 THEN
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
    WHERE document_number = v_doc
      AND status IN ('ABERTO','PROVISIONADO');
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
    );
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.sync_strategic_commitment_ledger() FROM PUBLIC, anon;
