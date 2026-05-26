-- FIX: orphaned fin_ledger_entries causing phantom revenue
-- Root cause: create_receivable_from_order() inserted ledger entries
-- WITHOUT order_id. When the order was deleted, purge_order_generated_records
-- removed receivables (which had order_id) but left ledger entries orphaned,
-- producing revenue with no traceable lançamento.

-- 1) Recreate the trigger function setting order_id on the ledger row
CREATE OR REPLACE FUNCTION public.create_receivable_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id
      ) VALUES (
        'Pedido #' || NEW.order_number || ' - Receita',
        NEW.valor_total, 'RECEITA',
        v_competence,
        NULL,
        'PED-' || NEW.order_number, NEW.client_id, 'client',
        'ABERTO', NULL, NULL,
        v_cost_center_id, NULL, v_chart_account_id,
        NEW.tenant_id, NEW.id, NEW.client_id
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
$$;

-- 2) Backfill order_id on existing ledger entries derived from orders
UPDATE public.fin_ledger_entries le
SET order_id = o.id
FROM public.orders o
WHERE le.order_id IS NULL
  AND le.tenant_id = o.tenant_id
  AND le.document_number = 'PED-' || o.order_number::text;

-- 3) Cleanup: remove orphan ledger entries that reference a non-existent order
--    (document_number like 'PED-N' but no matching order in same tenant)
DELETE FROM public.fin_ledger_entries le
WHERE le.order_id IS NULL
  AND le.document_number ~ '^PED-[0-9]+$'
  AND NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.tenant_id = le.tenant_id
      AND ('PED-' || o.order_number::text) = le.document_number
  );

-- 4) Safety net: when a ledger entry references an order, cascade delete via trigger
--    (purge_order_generated_records already deletes WHERE order_id = _order_id,
--     so once backfill above runs, future deletions stay clean.)
