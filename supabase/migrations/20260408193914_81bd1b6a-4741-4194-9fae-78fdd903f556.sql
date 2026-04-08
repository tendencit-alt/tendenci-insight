
-- Disable USER triggers only (not system FK triggers)
ALTER TABLE order_items DISABLE TRIGGER USER;
ALTER TABLE orders DISABLE TRIGGER USER;
ALTER TABLE fin_payables DISABLE TRIGGER USER;
ALTER TABLE fin_receivables DISABLE TRIGGER USER;
ALTER TABLE fin_ledger_entries DISABLE TRIGGER USER;

-- Financial
DELETE FROM fin_reconciliation_links;
DELETE FROM fin_reconciliation_rules;
DELETE FROM fin_ledger_splits;
DELETE FROM fin_attachments;
DELETE FROM fin_audit_logs;
DELETE FROM fin_payables;
DELETE FROM fin_receivables;
DELETE FROM fin_bank_transactions;
DELETE FROM fin_ledger_entries;
DELETE FROM fin_budgets;
DELETE FROM fin_financial_goals;
DELETE FROM fin_loan_contracts;
DELETE FROM fin_strategic_resource_account_configs;

-- Orders (with triggers disabled)
DELETE FROM order_history;
DELETE FROM order_items;
DELETE FROM order_responsibles;
DELETE FROM orders;

-- Projects
DELETE FROM project_files;
DELETE FROM project_history;
DELETE FROM project_notes;
DELETE FROM project_quotes;
DELETE FROM budget_product_lines;
DELETE FROM budget_products;
DELETE FROM project_budgets;
DELETE FROM projects;

-- Now safe to delete suppliers
DELETE FROM supplier_contacts;
DELETE FROM fee_supplier_configs;
DELETE FROM suppliers;

-- Financial structure
DELETE FROM fin_chart_accounts;
DELETE FROM fin_cost_centers;
DELETE FROM fin_projects;
DELETE FROM fin_bank_accounts;

-- Payment rates
DELETE FROM payment_conditions;
DELETE FROM payment_link_rates;
DELETE FROM credit_card_rates;
DELETE FROM boleto_rates;

-- Tendenci
DELETE FROM tendenci_campaign_dispatches;
DELETE FROM tendenci_campaign_queue;
DELETE FROM tendenci_daily_architect_goals;
DELETE FROM tendenci_daily_goal_records;
DELETE FROM tendenci_goal_progress;
DELETE FROM tendenci_company_goals;
DELETE FROM tendenci_seller_goals;
DELETE FROM tendenci_seller_ranking;
DELETE FROM tendenci_badges;
DELETE FROM tendenci_ia_produtos_estoque;
DELETE FROM tendenci_ia_produtos;
DELETE FROM tendenci_ia_conhecimento;
DELETE FROM tendenci_ia_config;
DELETE FROM tendenci_prospec_arq_campaign_dispatches;
DELETE FROM tendenci_prospec_arq_campaign_architects;
DELETE FROM tendenci_prospec_arq_logs;
DELETE FROM tendenci_prospec_arq_agendamentos;
DELETE FROM tendenci_prospec_arq_sequences;
DELETE FROM tendenci_prospec_arq_campaigns;
DELETE FROM tendenci_prospec_arq_segments;
DELETE FROM tendenci_prospec_arq_stages;
DELETE FROM tendenci_prospec_settings;
DELETE FROM tendenci_webhook_logs;
DELETE FROM tendenci_whatsapp_connections;
DELETE FROM tendenci_user_permissions;

-- Dispatch
DELETE FROM dispatch_session_items;
DELETE FROM dispatch_sessions;

-- AI
DELETE FROM ai_messages;
DELETE FROM ai_conversations;

-- Architect
DELETE FROM architect_timeline_attachments;
DELETE FROM architect_timeline;
DELETE FROM architect_files;
DELETE FROM architect_history;
DELETE FROM architect_indications;
DELETE FROM architect_projects;
DELETE FROM architects;

-- CRM
DELETE FROM crm_timeline_attachments;
DELETE FROM crm_timeline;
DELETE FROM crm_deal_files;
DELETE FROM crm_deal_history;
DELETE FROM crm_tasks;
DELETE FROM crm_activities;
DELETE FROM crm_deals;
DELETE FROM crm_cadence_steps;
DELETE FROM crm_cadences;
DELETE FROM crm_stages;
DELETE FROM crm_pipelines;

-- Old CRM
DELETE FROM activities;
DELETE FROM cadence_steps;
DELETE FROM cadences;
DELETE FROM deals;
DELETE FROM leads;

-- Others
DELETE FROM deleted_records;
DELETE FROM dashboards_personalizados;
DELETE FROM company_settings;
DELETE FROM clients;
DELETE FROM cost_center_tags;
DELETE FROM ad_spend;

-- Budget templates
DELETE FROM budget_template_lines;
DELETE FROM budget_product_templates;
DELETE FROM budget_global_costs;

-- Re-enable triggers
ALTER TABLE order_items ENABLE TRIGGER USER;
ALTER TABLE orders ENABLE TRIGGER USER;
ALTER TABLE fin_payables ENABLE TRIGGER USER;
ALTER TABLE fin_receivables ENABLE TRIGGER USER;
ALTER TABLE fin_ledger_entries ENABLE TRIGGER USER;
