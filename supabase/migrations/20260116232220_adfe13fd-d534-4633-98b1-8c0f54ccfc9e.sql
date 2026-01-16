-- Corrigir políticas para fin_ledger_entries
DROP POLICY IF EXISTS "Authenticated users can select fin_ledger_entries" ON public.fin_ledger_entries;
DROP POLICY IF EXISTS "Authenticated users can insert fin_ledger_entries" ON public.fin_ledger_entries;
DROP POLICY IF EXISTS "Authenticated users can update fin_ledger_entries" ON public.fin_ledger_entries;
DROP POLICY IF EXISTS "Authenticated users can delete fin_ledger_entries" ON public.fin_ledger_entries;

CREATE POLICY "Authenticated users can select fin_ledger_entries" 
  ON public.fin_ledger_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_ledger_entries" 
  ON public.fin_ledger_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_ledger_entries" 
  ON public.fin_ledger_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete fin_ledger_entries" 
  ON public.fin_ledger_entries FOR DELETE TO authenticated USING (true);

-- Corrigir políticas para fin_bank_accounts
DROP POLICY IF EXISTS "Authenticated users can select fin_bank_accounts" ON public.fin_bank_accounts;
DROP POLICY IF EXISTS "Authenticated users can insert fin_bank_accounts" ON public.fin_bank_accounts;
DROP POLICY IF EXISTS "Authenticated users can update fin_bank_accounts" ON public.fin_bank_accounts;
DROP POLICY IF EXISTS "Authenticated users can delete fin_bank_accounts" ON public.fin_bank_accounts;

CREATE POLICY "Authenticated users can select fin_bank_accounts" 
  ON public.fin_bank_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_bank_accounts" 
  ON public.fin_bank_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_bank_accounts" 
  ON public.fin_bank_accounts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete fin_bank_accounts" 
  ON public.fin_bank_accounts FOR DELETE TO authenticated USING (true);

-- Corrigir políticas para fin_cost_centers
DROP POLICY IF EXISTS "Authenticated users can select fin_cost_centers" ON public.fin_cost_centers;
DROP POLICY IF EXISTS "Authenticated users can insert fin_cost_centers" ON public.fin_cost_centers;
DROP POLICY IF EXISTS "Authenticated users can update fin_cost_centers" ON public.fin_cost_centers;
DROP POLICY IF EXISTS "Authenticated users can delete fin_cost_centers" ON public.fin_cost_centers;

CREATE POLICY "Authenticated users can select fin_cost_centers" 
  ON public.fin_cost_centers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_cost_centers" 
  ON public.fin_cost_centers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_cost_centers" 
  ON public.fin_cost_centers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete fin_cost_centers" 
  ON public.fin_cost_centers FOR DELETE TO authenticated USING (true);

-- Corrigir políticas para fin_projects
DROP POLICY IF EXISTS "Authenticated users can select fin_projects" ON public.fin_projects;
DROP POLICY IF EXISTS "Authenticated users can insert fin_projects" ON public.fin_projects;
DROP POLICY IF EXISTS "Authenticated users can update fin_projects" ON public.fin_projects;
DROP POLICY IF EXISTS "Authenticated users can delete fin_projects" ON public.fin_projects;

CREATE POLICY "Authenticated users can select fin_projects" 
  ON public.fin_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_projects" 
  ON public.fin_projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_projects" 
  ON public.fin_projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete fin_projects" 
  ON public.fin_projects FOR DELETE TO authenticated USING (true);

-- Corrigir políticas para fin_payables
DROP POLICY IF EXISTS "Authenticated users can select fin_payables" ON public.fin_payables;
DROP POLICY IF EXISTS "Authenticated users can insert fin_payables" ON public.fin_payables;
DROP POLICY IF EXISTS "Authenticated users can update fin_payables" ON public.fin_payables;
DROP POLICY IF EXISTS "Authenticated users can delete fin_payables" ON public.fin_payables;

CREATE POLICY "Authenticated users can select fin_payables" 
  ON public.fin_payables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_payables" 
  ON public.fin_payables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_payables" 
  ON public.fin_payables FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete fin_payables" 
  ON public.fin_payables FOR DELETE TO authenticated USING (true);

-- Corrigir políticas para fin_receivables
DROP POLICY IF EXISTS "Authenticated users can select fin_receivables" ON public.fin_receivables;
DROP POLICY IF EXISTS "Authenticated users can insert fin_receivables" ON public.fin_receivables;
DROP POLICY IF EXISTS "Authenticated users can update fin_receivables" ON public.fin_receivables;
DROP POLICY IF EXISTS "Authenticated users can delete fin_receivables" ON public.fin_receivables;

CREATE POLICY "Authenticated users can select fin_receivables" 
  ON public.fin_receivables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_receivables" 
  ON public.fin_receivables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_receivables" 
  ON public.fin_receivables FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete fin_receivables" 
  ON public.fin_receivables FOR DELETE TO authenticated USING (true);

-- Corrigir políticas para fin_budgets
DROP POLICY IF EXISTS "Authenticated users can select fin_budgets" ON public.fin_budgets;
DROP POLICY IF EXISTS "Authenticated users can insert fin_budgets" ON public.fin_budgets;
DROP POLICY IF EXISTS "Authenticated users can update fin_budgets" ON public.fin_budgets;
DROP POLICY IF EXISTS "Authenticated users can delete fin_budgets" ON public.fin_budgets;

CREATE POLICY "Authenticated users can select fin_budgets" 
  ON public.fin_budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_budgets" 
  ON public.fin_budgets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_budgets" 
  ON public.fin_budgets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete fin_budgets" 
  ON public.fin_budgets FOR DELETE TO authenticated USING (true);