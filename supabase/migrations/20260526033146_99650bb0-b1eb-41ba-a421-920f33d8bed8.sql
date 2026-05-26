
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_tenant uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_owner()
    OR (
      _tenant IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.user_tenants ut
          WHERE ut.user_id = auth.uid()
            AND ut.tenant_id = _tenant
            AND ut.role IN ('administrador','owner')
        )
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          LEFT JOIN public.profile_types pt ON pt.id = p.profile_type_id
          WHERE p.id = auth.uid()
            AND (p.tenant_id = _tenant OR p.current_tenant_id = _tenant)
            AND (p.role = 'admin' OR pt.name IN ('administrador','owner'))
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_any_tenant_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_owner()
    OR EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.role IN ('administrador','owner')
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      LEFT JOIN public.profile_types pt ON pt.id = p.profile_type_id
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR pt.name IN ('administrador','owner'))
    );
$$;

DO $$
DECLARE
  t text;
  pol record;
  has_tenant boolean;
  all_tables text[] := ARRAY[
    -- with tenant_id
    'orders','clients','crm_deals','crm_cadences','crm_pipelines','crm_proposals','crm_revenue_forecast',
    'leads','products','suppliers','activities','deals',
    'production_orders','production_phases','production_automations',
    'projects','project_budgets',
    'prj_projects','prj_phases','prj_planned_resources','prj_execution_logs','prj_scope_changes',
    'operational_projects',
    'ops_orders','ops_activities','ops_capacity','ops_material_usage','ops_occurrences','ops_scheduling',
    'fin_ledger_entries','fin_receivables','fin_payables','fin_cost_centers','fin_chart_accounts',
    'fin_projects','fin_budgets','fin_forecasts','fin_bank_accounts','fin_financial_goals',
    'fin_goal_alerts','fin_loan_contracts','fin_reconciliation_rules',
    'fin_strategic_resource_account_configs','fin_event_automation_rules',
    'hr_departments','hr_employees','hr_positions','hr_teams','hr_timesheets','hr_labor_allocations',
    'inv_stock_reservations','material_requests',
    'plan_budgets','plan_goals','plan_scenarios',
    'sup_requests','sup_quotations','sup_quotation_items','sup_supplier_evaluations',
    'purchase_orders',
    'order_strategic_commitments','onboarding_progress','tenant_catalogo_settings',
    'cost_center_tags',
    -- without tenant_id (child tables)
    'order_items','order_history','order_responsibles',
    'product_bom','product_cost_centers',
    'fin_ledger_splits','fin_reconciliation_links','fin_attachments',
    'crm_deal_files','crm_tasks','crm_timeline','crm_timeline_attachments','crm_stages','crm_cadence_steps',
    'lead_attachments','leads_whatsapp',
    'project_quotes','project_files','project_notes',
    'production_attachments','production_product_bom','production_products'
  ];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      CONTINUE;
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='tenant_id'
    ) INTO has_tenant;

    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=t AND cmd='DELETE'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    IF has_tenant THEN
      EXECUTE format(
        'CREATE POLICY admin_only_delete ON public.%I FOR DELETE TO authenticated USING (public.is_tenant_admin(tenant_id))',
        t
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY admin_only_delete ON public.%I FOR DELETE TO authenticated USING (public.is_any_tenant_admin())',
        t
      );
    END IF;
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION public.delete_order_cascade(_order_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tenant uuid;
BEGIN
  SELECT tenant_id INTO _tenant FROM public.orders WHERE id = _order_id;
  IF _tenant IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;
  IF NOT public.is_tenant_admin(_tenant) THEN
    RAISE EXCEPTION 'Acesso negado: apenas Administradores podem excluir pedidos';
  END IF;
  DELETE FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;
END;
$$;
