
-- 1. Adicionar tenant_id em todas as tabelas
DO $$
DECLARE
  tables_to_alter TEXT[] := ARRAY[
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
    'production_phase_templates', 'production_order_groups'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_to_alter LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='tenant_id') THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant_id UUID REFERENCES public.tenants(id)', t);
      END IF;
    END IF;
  END LOOP;
END $$;

-- 2. Desabilitar triggers de USUARIO na tabela orders (não system triggers)
ALTER TABLE public.orders DISABLE TRIGGER USER;

-- 3. Atribuir tenant a registros existentes (orders primeiro, triggers desabilitados)
UPDATE public.orders SET tenant_id = 'b1000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- 4. Re-habilitar triggers
ALTER TABLE public.orders ENABLE TRIGGER USER;

-- 5. Update demais tabelas
DO $$
DECLARE
  tables_to_update TEXT[] := ARRAY[
    'clients', 'leads', 'architects', 'suppliers', 'products',
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
    'production_phase_templates', 'production_order_groups'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_to_update LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='tenant_id') THEN
      EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t, 'b1000000-0000-0000-0000-000000000001');
    END IF;
  END LOOP;
END $$;

-- 6. Função helper para RLS
CREATE OR REPLACE FUNCTION public.tenant_rls_check(row_tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin() OR row_tenant_id = public.get_user_tenant_id()
$$;

-- 7. Índices
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON public.orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant ON public.clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON public.suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_architects_tenant ON public.architects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON public.leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_tenant ON public.crm_deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipelines_tenant ON public.crm_pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_ledger_entries_tenant ON public.fin_ledger_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_payables_tenant ON public.fin_payables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_receivables_tenant ON public.fin_receivables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_chart_accounts_tenant ON public.fin_chart_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_tenant ON public.production_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_tenant ON public.user_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON public.notifications(tenant_id);
