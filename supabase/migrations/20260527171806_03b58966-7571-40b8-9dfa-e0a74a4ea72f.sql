DO $$
BEGIN
  -- Desliga triggers de proteção/auditoria temporariamente (mantém RLS bypassada pelo papel da migração)
  SET LOCAL session_replication_role = 'replica';

  -- ===== Financeiro: filhos antes de pais =====
  DELETE FROM public.fin_ledger_splits;
  DELETE FROM public.fin_reconciliation_links;
  DELETE FROM public.fin_audit_logs;
  DELETE FROM public.fin_business_events;
  DELETE FROM public.fin_ledger_entries;
  DELETE FROM public.fin_bank_transactions;
  DELETE FROM public.fin_payables;
  DELETE FROM public.fin_receivables;
  DELETE FROM public.fin_recurring_contract_timeline;
  DELETE FROM public.fin_recurring_contracts;
  DELETE FROM public.fin_loan_contracts;

  -- ===== CRM / Vendas =====
  DELETE FROM public.crm_deal_files;
  DELETE FROM public.crm_deal_history;
  DELETE FROM public.crm_proposal_versions;
  DELETE FROM public.crm_proposals;
  DELETE FROM public.crm_tasks;
  DELETE FROM public.crm_deals;
  DELETE FROM public.deals;

  -- ===== Pedidos =====
  DELETE FROM public.order_strategic_commitments;
  DELETE FROM public.order_responsibles;
  DELETE FROM public.order_history;
  DELETE FROM public.order_items;

  -- ===== Produção / Entregas / Ops =====
  DELETE FROM public.production_attachments;
  DELETE FROM public.production_logs;
  DELETE FROM public.production_automation_logs;
  DELETE FROM public.production_order_groups;
  DELETE FROM public.production_orders;
  DELETE FROM public.delivery_orders;
  DELETE FROM public.installation_orders;
  DELETE FROM public.ops_orders;

  -- Pedidos (após filhos de produção/entrega que referenciam orders)
  DELETE FROM public.orders;

  -- ===== Compras / Estoque =====
  DELETE FROM public.purchase_order_items;
  DELETE FROM public.purchase_orders;
  DELETE FROM public.inv_stock_reservations;
  DELETE FROM public.stock_movements;

  -- ===== RH (movimento + cadastros, conforme confirmado) =====
  DELETE FROM public.hr_labor_allocations;
  DELETE FROM public.hr_timesheets;
  DELETE FROM public.hr_time_records;
  DELETE FROM public.hr_absences;
  DELETE FROM public.hr_medical_certificates;
  DELETE FROM public.hr_employees;

  -- ===== PJ =====
  DELETE FROM public.service_provider_documents;
  DELETE FROM public.service_providers;

  -- ===== Produtos / Fornecedores / Contratos =====
  DELETE FROM public.products;
  DELETE FROM public.suppliers;
  DELETE FROM public.contracts;

  -- ===== Eventos / Logs operacionais =====
  DELETE FROM public.cross_module_events;
  DELETE FROM public.notifications;
  DELETE FROM public.erp_notifications;
  DELETE FROM public.erp_tasks;
  DELETE FROM public.audit_log;
  DELETE FROM public.audit_import_logs;
  DELETE FROM public.billing_events;
  DELETE FROM public.ai_decision_events;
  DELETE FROM public.automation_suggestion_events;
  DELETE FROM public.capacity_preventive_actions;
  DELETE FROM public.customer_retention_events;
  DELETE FROM public.decision_engine_events;
  DELETE FROM public.dependency_impact_events;
  DELETE FROM public.education_completion_events;
  DELETE FROM public.incident_timeline_events;
  DELETE FROM public.integration_health_events;
  DELETE FROM public.offer_delivery_events;
  DELETE FROM public.preventive_action_logs;
  DELETE FROM public.product_analytics_events;
  DELETE FROM public.root_cause_analysis_events;
  DELETE FROM public.self_service_events;
  DELETE FROM public.tenant_session_events;
  DELETE FROM public.upgrade_ui_events;
  DELETE FROM public.deleted_records;
END $$;

-- ===== Reset de numeração =====
ALTER SEQUENCE public.orders_order_number_seq RESTART WITH 1;
ALTER SEQUENCE public.production_orders_order_number_seq RESTART WITH 1;
ALTER SEQUENCE public.purchase_orders_order_number_seq RESTART WITH 1;
ALTER SEQUENCE public.ops_orders_order_number_seq RESTART WITH 1;