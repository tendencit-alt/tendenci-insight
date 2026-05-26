
-- 1) Improve purge to also remove ledger entries by document_number key 'PED-<order_id>'
CREATE OR REPLACE FUNCTION public.purge_order_generated_records(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _project_ids uuid[] := '{}'::uuid[];
  _doc_key text := 'PED-' || _order_id::text;
BEGIN
  SELECT COALESCE(array_agg(id), '{}'::uuid[])
    INTO _project_ids
  FROM public.fin_projects
  WHERE order_id = _order_id;

  DELETE FROM public.fin_assets WHERE project_id = ANY(_project_ids);
  DELETE FROM public.fin_classification_history WHERE project_id = ANY(_project_ids);
  DELETE FROM public.fin_classification_rules WHERE project_id = ANY(_project_ids);
  DELETE FROM public.fin_event_automation_rules WHERE project_id = ANY(_project_ids);
  DELETE FROM public.fin_forecast_entries WHERE project_id = ANY(_project_ids);
  DELETE FROM public.fin_recurring_contracts WHERE project_id = ANY(_project_ids);

  DELETE FROM public.fin_receivables
  WHERE order_id = _order_id
     OR project_id = ANY(_project_ids)
     OR document_number = _doc_key
     OR ledger_entry_id IN (
        SELECT id FROM public.fin_ledger_entries
        WHERE order_id = _order_id OR project_id = ANY(_project_ids) OR document_number = _doc_key
     );

  DELETE FROM public.fin_payables
  WHERE order_id = _order_id
     OR project_id = ANY(_project_ids)
     OR document_number = _doc_key
     OR ledger_entry_id IN (
        SELECT id FROM public.fin_ledger_entries
        WHERE order_id = _order_id OR project_id = ANY(_project_ids) OR document_number = _doc_key
     );

  DELETE FROM public.fin_ledger_entries
  WHERE order_id = _order_id
     OR project_id = ANY(_project_ids)
     OR document_number = _doc_key;

  DELETE FROM public.fin_financial_goals WHERE order_id = _order_id OR project_id = ANY(_project_ids);
  DELETE FROM public.fin_budgets WHERE order_id = _order_id OR project_id = ANY(_project_ids);
  DELETE FROM public.fin_forecasts WHERE order_id = _order_id OR project_id = ANY(_project_ids);

  DELETE FROM public.ops_orders WHERE source_order_id = _order_id;

  DELETE FROM public.production_orders
  WHERE order_id = _order_id
     OR order_item_id IN (SELECT id FROM public.order_items WHERE order_id = _order_id);

  DELETE FROM public.production_order_groups WHERE order_id = _order_id;
  DELETE FROM public.quotes WHERE order_id = _order_id;
  DELETE FROM public.contracts WHERE order_id = _order_id;
  DELETE FROM public.order_history WHERE order_id = _order_id;
END;
$function$;

-- 2) Cleanup existing orphan ledger entries / receivables / payables left by previously deleted orders
DELETE FROM public.fin_receivables r
WHERE r.document_number LIKE 'PED-%'
  AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE 'PED-' || o.id::text = r.document_number);

DELETE FROM public.fin_payables p
WHERE p.document_number LIKE 'PED-%'
  AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE 'PED-' || o.id::text = p.document_number);

DELETE FROM public.fin_ledger_entries l
WHERE l.document_number LIKE 'PED-%'
  AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE 'PED-' || o.id::text = l.document_number);

-- Also clean ledger entries with no order_id/project_id whose description references a non-existent order number
DELETE FROM public.fin_ledger_entries l
WHERE l.order_id IS NULL
  AND l.project_id IS NULL
  AND l.description ~ 'Pedido #\d+'
  AND NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.order_number::text = (regexp_match(l.description, 'Pedido #(\d+)'))[1]
  );
