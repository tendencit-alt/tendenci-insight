
-- Função genérica para auto-preencher tenant_id
CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se tenant_id já foi definido, manter
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Buscar tenant_id do usuário logado
  NEW.tenant_id := public.get_user_tenant_id();
  
  RETURN NEW;
END;
$$;

-- Aplicar trigger em todas as tabelas com tenant_id
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
  trigger_name TEXT;
BEGIN
  FOREACH t IN ARRAY tables_with_tenant LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='tenant_id') THEN
      trigger_name := 'trg_set_tenant_' || t;
      -- Drop se existir
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', trigger_name, t);
      -- Criar trigger
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id()',
        trigger_name, t
      );
    END IF;
  END LOOP;
END $$;
