
DO $$
DECLARE
  v_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_ids
  FROM public.fin_cost_centers
  WHERE code ~ '^CC0*[0-9]+$' AND code BETWEEN 'CC001' AND 'CC011';

  IF v_ids IS NULL OR array_length(v_ids, 1) = 0 THEN
    RAISE NOTICE 'Nenhum centro de custo encontrado.';
    RETURN;
  END IF;

  UPDATE public.fin_assets SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.fin_bank_transactions SET suggested_cost_center_id = NULL WHERE suggested_cost_center_id = ANY(v_ids);
  UPDATE public.fin_budgets SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.fin_classification_history SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.fin_classification_rules SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.fin_event_automation_rules SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.fin_financial_goals SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.fin_forecast_entries SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.fin_forecasts SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.fin_ledger_entries SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.fin_ledger_splits SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.fin_payables SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.fin_projects SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.fin_receivables SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.fin_reconciliation_rules SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.fin_recurring_contracts SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.hr_departments SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.hr_labor_allocations SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.operational_projects SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.ops_orders SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.plan_budgets SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.plan_goals SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.prj_projects SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.purchase_orders SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);
  UPDATE public.sup_requests SET cost_center_id = NULL WHERE cost_center_id = ANY(v_ids);

  DELETE FROM public.fin_cost_centers WHERE id = ANY(v_ids);
END $$;
