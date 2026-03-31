
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'architects','architect_files','architect_history','architect_indications','architect_projects',
    'crm_activities','crm_deal_files','crm_deal_history','crm_pipelines','crm_stages','crm_tasks',
    'crm_timeline_attachments','crm_cadences','crm_cadence_steps',
    'deleted_records','order_history','order_responsibles','profiles',
    'leads','leads_whatsapp','lead_sources',
    'production_types','production_phase_templates','production_logs','production_attachments',
    'production_products','production_product_bom','production_automations','production_automation_logs','production_order_groups',
    'fin_attachments','fin_audit_logs','fin_budgets','fin_ledger_splits',
    'fin_reconciliation_links','fin_reconciliation_rules','fin_strategic_resource_account_configs',
    'payment_conditions','payment_link_rates','credit_card_rates','boleto_rates','cost_center_tags',
    'budget_global_costs','budget_products','budget_product_lines','budget_product_templates','budget_template_lines',
    'project_budgets','project_files','project_history','project_notes','project_quotes',
    'master_ideas','master_idea_attachments','material_requests','reminders','labor_types',
    'product_subcategories','product_bom','product_cost_centers','product_price_history','product_suppliers',
    'dashboards_personalizados','profile_types','profile_type_permissions','user_permissions',
    'tendenci_user_permissions','tendenci_company_goals','tendenci_seller_ranking',
    'tendenci_ia_config','tendenci_ia_conhecimento','tendenci_ia_produtos','tendenci_ia_produtos_estoque',
    'supplier_contacts','stock_alerts_config'
  ];
BEGIN
  FOR t IN SELECT unnest(tables)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = t AND schemaname = 'public'
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END;
$$;
