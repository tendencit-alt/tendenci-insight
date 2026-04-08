
-- Aplicar policy RESTRICTIVE de tenant em todas as tabelas com tenant_id
-- Isso adiciona uma camada de filtro que funciona como AND com policies existentes
DO $$
DECLARE
  tables_with_tenant TEXT[] := ARRAY[
    'orders', 'clients', 'leads', 'architects', 'suppliers', 'products',
    'crm_pipelines', 'crm_deals', 'crm_cadences',
    'fin_bank_accounts', 'fin_chart_accounts', 'fin_cost_centers', 
    'fin_ledger_entries', 'fin_payables', 'fin_receivables', 'fin_projects',
    'fin_strategic_resource_account_configs', 'fin_loan_contracts',
    'fin_budgets', 'fin_financial_goals',
    'production_orders', 'production_types', 'production_phases',
    'stock_locations', 'stock_movements',
    'profile_types', 'user_permissions', 'menu_items',
    'payment_conditions', 'boleto_rates', 'credit_card_rates', 'payment_link_rates',
    'cost_center_tags', 'labor_types',
    'notifications', 'deleted_records', 'dashboards_personalizados',
    'budget_global_costs', 'budget_product_templates',
    'lead_sources', 'followup_templates',
    'product_categories', 'product_subcategories',
    'project_budgets', 'projects',
    'tendenci_seller_goals', 'tendenci_company_goals',
    'tendenci_ia_config', 'tendenci_ia_conhecimento', 'tendenci_ia_produtos',
    'tendenci_whatsapp_connections', 'tendenci_prospec_settings',
    'tendenci_prospec_arq_stages', 'tendenci_prospec_arq_segments',
    'tendenci_prospec_arq_campaigns', 'tendenci_prospec_arq_sequences',
    'system_activities', 'dispatch_sessions',
    'pipelines', 'purchase_orders',
    'ai_conversations', 'reminders', 'fee_supplier_configs',
    'production_automations', 'stock_alerts_config',
    'production_phase_templates', 'production_order_groups',
    'company_settings'
  ];
  t TEXT;
  policy_select TEXT;
  policy_modify TEXT;
BEGIN
  FOREACH t IN ARRAY tables_with_tenant LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='tenant_id') THEN
      -- Drop existing tenant policies if any
      policy_select := 'tenant_isolation_select_' || t;
      policy_modify := 'tenant_isolation_modify_' || t;
      
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_select, t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_modify, t);
      
      -- SELECT: usuário vê apenas seu tenant OU super admin vê tudo
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (public.tenant_rls_check(tenant_id))',
        policy_select, t
      );
      
      -- INSERT/UPDATE/DELETE: mesma regra
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.tenant_rls_check(tenant_id)) WITH CHECK (public.tenant_rls_check(tenant_id))',
        policy_modify, t
      );
    END IF;
  END LOOP;
END $$;

-- Também adicionar policy restrictive na tabela profiles para isolamento
DROP POLICY IF EXISTS tenant_isolation_select_profiles ON public.profiles;
DROP POLICY IF EXISTS tenant_isolation_modify_profiles ON public.profiles;

CREATE POLICY tenant_isolation_select_profiles 
  ON public.profiles AS RESTRICTIVE 
  FOR SELECT TO authenticated 
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());

CREATE POLICY tenant_isolation_modify_profiles 
  ON public.profiles AS RESTRICTIVE 
  FOR ALL TO authenticated 
  USING (public.is_super_admin() OR tenant_id = public.get_user_tenant_id())
  WITH CHECK (public.is_super_admin() OR tenant_id = public.get_user_tenant_id());
