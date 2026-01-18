-- Set REPLICA IDENTITY FULL for all financial tables to ensure realtime events work correctly
ALTER TABLE public.fin_ledger_entries REPLICA IDENTITY FULL;
ALTER TABLE public.fin_payables REPLICA IDENTITY FULL;
ALTER TABLE public.fin_receivables REPLICA IDENTITY FULL;
ALTER TABLE public.fin_projects REPLICA IDENTITY FULL;
ALTER TABLE public.fin_bank_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.fin_financial_goals REPLICA IDENTITY FULL;
ALTER TABLE public.fin_cost_centers REPLICA IDENTITY FULL;
ALTER TABLE public.fin_chart_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.fin_bank_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.fin_loan_contracts REPLICA IDENTITY FULL;
ALTER TABLE public.suppliers REPLICA IDENTITY FULL;
ALTER TABLE public.clients REPLICA IDENTITY FULL;