-- Make all blocking client FKs use ON DELETE SET NULL so clients can be removed
-- without losing historical records (mirrors orders/production_orders pattern).

ALTER TABLE public.operational_projects DROP CONSTRAINT IF EXISTS operational_projects_client_id_fkey;
ALTER TABLE public.operational_projects ADD CONSTRAINT operational_projects_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.ops_orders DROP CONSTRAINT IF EXISTS ops_orders_client_id_fkey;
ALTER TABLE public.ops_orders ADD CONSTRAINT ops_orders_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.prj_projects DROP CONSTRAINT IF EXISTS prj_projects_client_id_fkey;
ALTER TABLE public.prj_projects ADD CONSTRAINT prj_projects_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.fin_projects DROP CONSTRAINT IF EXISTS fin_projects_client_id_fkey;
ALTER TABLE public.fin_projects ADD CONSTRAINT fin_projects_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.fin_receivables DROP CONSTRAINT IF EXISTS fin_receivables_customer_id_fkey;
ALTER TABLE public.fin_receivables ADD CONSTRAINT fin_receivables_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.fin_ledger_entries DROP CONSTRAINT IF EXISTS fin_ledger_entries_client_id_fkey;
ALTER TABLE public.fin_ledger_entries ADD CONSTRAINT fin_ledger_entries_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.fin_financial_goals DROP CONSTRAINT IF EXISTS fin_financial_goals_client_id_fkey;
ALTER TABLE public.fin_financial_goals ADD CONSTRAINT fin_financial_goals_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.fin_budgets DROP CONSTRAINT IF EXISTS fin_budgets_client_id_fkey;
ALTER TABLE public.fin_budgets ADD CONSTRAINT fin_budgets_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.fin_forecasts DROP CONSTRAINT IF EXISTS fin_forecasts_client_id_fkey;
ALTER TABLE public.fin_forecasts ADD CONSTRAINT fin_forecasts_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.production_order_groups DROP CONSTRAINT IF EXISTS production_order_groups_client_id_fkey;
ALTER TABLE public.production_order_groups ADD CONSTRAINT production_order_groups_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_client_id_fkey;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_client_id_fkey;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_client_id_fkey;
ALTER TABLE public.leads ADD CONSTRAINT leads_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;