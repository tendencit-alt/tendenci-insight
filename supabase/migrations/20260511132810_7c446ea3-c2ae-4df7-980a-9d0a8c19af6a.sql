
CREATE OR REPLACE FUNCTION public.create_receivable_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ledger_id uuid;
  v_cost_center_id uuid;
  v_centro_custo_name text;
  v_chart_account_id uuid;
  v_competence date;
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

    v_chart_account_id := COALESCE(
      NEW.chart_account_id,
      (SELECT id FROM public.fin_chart_accounts WHERE code = '1.1' LIMIT 1)
    );

    v_competence := COALESCE(NEW.data_emissao::date, now()::date);

    IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date,
        document_number, party_id, party_type, status, notes, created_by,
        cost_center_id, project_id, chart_account_id, tenant_id
      ) VALUES (
        'Pedido #' || NEW.order_number || ' - Receita',
        NEW.valor_total, 'RECEITA',
        v_competence,
        NULL,
        'PED-' || NEW.order_number, NEW.client_id, 'client',
        'A_RECEBER', NULL, NULL,
        v_cost_center_id, NULL, v_chart_account_id,
        NEW.tenant_id
      )
      RETURNING id INTO v_ledger_id;

      INSERT INTO public.fin_receivables (
        description, amount, due_date, competence_date, status, customer_id,
        order_id, document_number, ledger_entry_id, cost_center_id,
        chart_account_id, tenant_id
      ) VALUES (
        'Pedido #' || NEW.order_number,
        NEW.valor_total,
        COALESCE(NEW.data_primeiro_vencimento, v_competence),
        v_competence,
        'ABERTO', NEW.client_id, NEW.id,
        'PED-' || NEW.order_number, v_ledger_id, v_cost_center_id,
        v_chart_account_id,
        NEW.tenant_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
