
-- Reset total: limpar todos os dados transacionais
-- Using TRUNCATE CASCADE to handle FK dependencies

TRUNCATE TABLE fin_reconciliation_links CASCADE;
TRUNCATE TABLE fin_ledger_splits CASCADE;
TRUNCATE TABLE fin_attachments CASCADE;
TRUNCATE TABLE fin_audit_logs CASCADE;
TRUNCATE TABLE fin_bank_transactions CASCADE;
TRUNCATE TABLE fin_receivables CASCADE;
TRUNCATE TABLE fin_payables CASCADE;
TRUNCATE TABLE fin_ledger_entries CASCADE;
TRUNCATE TABLE fin_budgets CASCADE;
TRUNCATE TABLE fin_financial_goals CASCADE;
TRUNCATE TABLE fin_loan_contracts CASCADE;
TRUNCATE TABLE production_attachments CASCADE;
TRUNCATE TABLE production_logs CASCADE;
TRUNCATE TABLE production_automation_logs CASCADE;
TRUNCATE TABLE production_product_bom CASCADE;
TRUNCATE TABLE production_products CASCADE;
TRUNCATE TABLE production_orders CASCADE;
TRUNCATE TABLE production_order_groups CASCADE;
TRUNCATE TABLE deleted_records CASCADE;
TRUNCATE TABLE order_history CASCADE;
TRUNCATE TABLE order_responsibles CASCADE;
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
