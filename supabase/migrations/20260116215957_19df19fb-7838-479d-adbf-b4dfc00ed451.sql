-- =============================================
-- MÓDULO FINANCEIRO - ESTRUTURA DE BANCO DE DADOS
-- =============================================

-- 1. CONTAS BANCÁRIAS
CREATE TABLE public.fin_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  bank_name TEXT,
  agency TEXT,
  account_number TEXT,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  opening_balance_date DATE DEFAULT CURRENT_DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PLANO DE CONTAS (hierárquico)
CREATE TABLE public.fin_chart_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.fin_chart_accounts(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  nature TEXT CHECK (nature IN ('RECEITA','DESPESA','ATIVO','PASSIVO','RESULTADO')),
  in_dre BOOLEAN DEFAULT true,
  in_cashflow BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  dre_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CENTROS DE CUSTO FINANCEIROS
CREATE TABLE public.fin_cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  owner_id UUID REFERENCES public.profiles(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PROJETOS FINANCEIROS
CREATE TABLE public.fin_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  status TEXT DEFAULT 'ativo',
  owner_id UUID REFERENCES public.profiles(id),
  budget DECIMAL(15,2),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. LANÇAMENTOS (Livro Caixa/Razão) - SINGLE SOURCE OF TRUTH
CREATE TABLE public.fin_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN ('RECEITA','DESPESA','TRANSFERENCIA','AJUSTE')),
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  competence_date DATE NOT NULL,
  cash_date DATE,
  bank_account_id UUID REFERENCES public.fin_bank_accounts(id),
  chart_account_id UUID REFERENCES public.fin_chart_accounts(id),
  cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  project_id UUID REFERENCES public.fin_projects(id),
  party_id UUID,
  party_type TEXT CHECK (party_type IN ('supplier','client')),
  status TEXT CHECK (status IN ('ABERTO','PARCIAL','PAGO_RECEBIDO','VENCIDO','CANCELADO')) DEFAULT 'ABERTO',
  reconciled BOOLEAN DEFAULT false,
  reversal_of_id UUID REFERENCES public.fin_ledger_entries(id),
  payment_method TEXT,
  installment_number INTEGER,
  total_installments INTEGER,
  document_number TEXT,
  tags TEXT[],
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. CONTAS A PAGAR
CREATE TABLE public.fin_payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id),
  amount DECIMAL(15,2) NOT NULL,
  paid_amount DECIMAL(15,2) DEFAULT 0,
  due_date DATE NOT NULL,
  competence_date DATE,
  status TEXT CHECK (status IN ('ABERTO','PARCIAL','PAGO','VENCIDO','CANCELADO')) DEFAULT 'ABERTO',
  installment INTEGER DEFAULT 1,
  total_installments INTEGER DEFAULT 1,
  chart_account_id UUID REFERENCES public.fin_chart_accounts(id),
  cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  project_id UUID REFERENCES public.fin_projects(id),
  payment_date DATE,
  bank_account_id UUID REFERENCES public.fin_bank_accounts(id),
  ledger_entry_id UUID REFERENCES public.fin_ledger_entries(id),
  reconciled BOOLEAN DEFAULT false,
  description TEXT,
  document_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. CONTAS A RECEBER
CREATE TABLE public.fin_receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.clients(id),
  order_id UUID REFERENCES public.orders(id),
  deal_id UUID REFERENCES public.crm_deals(id),
  amount DECIMAL(15,2) NOT NULL,
  received_amount DECIMAL(15,2) DEFAULT 0,
  due_date DATE NOT NULL,
  competence_date DATE,
  status TEXT CHECK (status IN ('ABERTO','PARCIAL','RECEBIDO','VENCIDO','CANCELADO')) DEFAULT 'ABERTO',
  installment INTEGER DEFAULT 1,
  total_installments INTEGER DEFAULT 1,
  chart_account_id UUID REFERENCES public.fin_chart_accounts(id),
  cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  project_id UUID REFERENCES public.fin_projects(id),
  receipt_date DATE,
  bank_account_id UUID REFERENCES public.fin_bank_accounts(id),
  ledger_entry_id UUID REFERENCES public.fin_ledger_entries(id),
  reconciled BOOLEAN DEFAULT false,
  description TEXT,
  document_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. TRANSAÇÕES OFX IMPORTADAS
CREATE TABLE public.fin_bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID REFERENCES public.fin_bank_accounts(id) NOT NULL,
  bank_transaction_id TEXT NOT NULL,
  date DATE NOT NULL,
  bank_memo TEXT,
  amount DECIMAL(15,2) NOT NULL,
  direction TEXT CHECK (direction IN ('IN','OUT')) NOT NULL,
  status TEXT CHECK (status IN ('PENDENTE','SUGERIDA','CONCILIADA','IGNORADA','DIVERGENTE')) DEFAULT 'PENDENTE',
  file_hash TEXT,
  import_batch_id UUID,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bank_account_id, bank_transaction_id)
);

-- 9. LINKS DE CONCILIAÇÃO
CREATE TABLE public.fin_reconciliation_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_transaction_id UUID REFERENCES public.fin_bank_transactions(id) ON DELETE CASCADE,
  ledger_entry_id UUID REFERENCES public.fin_ledger_entries(id) ON DELETE CASCADE,
  match_type TEXT CHECK (match_type IN ('AUTO','MANUAL','SPLIT')),
  score DECIMAL(5,2),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. ORÇAMENTO
CREATE TABLE public.fin_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  chart_account_id UUID REFERENCES public.fin_chart_accounts(id),
  cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  project_id UUID REFERENCES public.fin_projects(id),
  amount DECIMAL(15,2) NOT NULL,
  version INTEGER DEFAULT 1,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. ANEXOS FINANCEIROS
CREATE TABLE public.fin_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. AUDITORIA FINANCEIRA
CREATE TABLE public.fin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. REGRAS DE CONCILIAÇÃO AUTOMÁTICA
CREATE TABLE public.fin_reconciliation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  pattern_regex TEXT,
  keywords TEXT[],
  chart_account_id UUID REFERENCES public.fin_chart_accounts(id),
  cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  party_id UUID,
  party_type TEXT,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================
CREATE INDEX idx_fin_ledger_competence ON public.fin_ledger_entries(competence_date);
CREATE INDEX idx_fin_ledger_cash ON public.fin_ledger_entries(cash_date);
CREATE INDEX idx_fin_ledger_bank ON public.fin_ledger_entries(bank_account_id);
CREATE INDEX idx_fin_ledger_chart ON public.fin_ledger_entries(chart_account_id);
CREATE INDEX idx_fin_ledger_status ON public.fin_ledger_entries(status);
CREATE INDEX idx_fin_payables_due ON public.fin_payables(due_date);
CREATE INDEX idx_fin_payables_status ON public.fin_payables(status);
CREATE INDEX idx_fin_payables_supplier ON public.fin_payables(supplier_id);
CREATE INDEX idx_fin_receivables_due ON public.fin_receivables(due_date);
CREATE INDEX idx_fin_receivables_status ON public.fin_receivables(status);
CREATE INDEX idx_fin_receivables_customer ON public.fin_receivables(customer_id);
CREATE INDEX idx_fin_bank_tx_date ON public.fin_bank_transactions(date);
CREATE INDEX idx_fin_bank_tx_status ON public.fin_bank_transactions(status);
CREATE INDEX idx_fin_audit_entity ON public.fin_audit_logs(entity_type, entity_id);
CREATE INDEX idx_fin_audit_user ON public.fin_audit_logs(user_id);

-- =============================================
-- TRIGGER PARA AUDITORIA AUTOMÁTICA
-- =============================================
CREATE OR REPLACE FUNCTION public.fn_fin_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.fin_audit_logs (user_id, entity_type, entity_id, action, before_data, after_data)
  VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar trigger nas tabelas principais
CREATE TRIGGER audit_fin_ledger AFTER INSERT OR UPDATE OR DELETE ON public.fin_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_fin_audit_log();
CREATE TRIGGER audit_fin_payables AFTER INSERT OR UPDATE OR DELETE ON public.fin_payables
  FOR EACH ROW EXECUTE FUNCTION public.fn_fin_audit_log();
CREATE TRIGGER audit_fin_receivables AFTER INSERT OR UPDATE OR DELETE ON public.fin_receivables
  FOR EACH ROW EXECUTE FUNCTION public.fn_fin_audit_log();
CREATE TRIGGER audit_fin_bank_accounts AFTER INSERT OR UPDATE OR DELETE ON public.fin_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.fn_fin_audit_log();

-- =============================================
-- TRIGGER PARA ATUALIZAR STATUS VENCIDO
-- =============================================
CREATE OR REPLACE FUNCTION public.fn_fin_update_overdue_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ABERTO' AND NEW.due_date < CURRENT_DATE THEN
    NEW.status := 'VENCIDO';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_payables_overdue BEFORE INSERT OR UPDATE ON public.fin_payables
  FOR EACH ROW EXECUTE FUNCTION public.fn_fin_update_overdue_status();
CREATE TRIGGER update_receivables_overdue BEFORE INSERT OR UPDATE ON public.fin_receivables
  FOR EACH ROW EXECUTE FUNCTION public.fn_fin_update_overdue_status();

-- =============================================
-- TRIGGER PARA UPDATED_AT
-- =============================================
CREATE TRIGGER update_fin_bank_accounts_updated_at BEFORE UPDATE ON public.fin_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fin_ledger_updated_at BEFORE UPDATE ON public.fin_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fin_payables_updated_at BEFORE UPDATE ON public.fin_payables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fin_receivables_updated_at BEFORE UPDATE ON public.fin_receivables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fin_budgets_updated_at BEFORE UPDATE ON public.fin_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.fin_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_chart_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_reconciliation_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_reconciliation_rules ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários autenticados (ajustar conforme sistema de permissões)
CREATE POLICY "Authenticated users can view fin_bank_accounts" ON public.fin_bank_accounts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_bank_accounts" ON public.fin_bank_accounts
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_bank_accounts" ON public.fin_bank_accounts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view fin_chart_accounts" ON public.fin_chart_accounts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_chart_accounts" ON public.fin_chart_accounts
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_chart_accounts" ON public.fin_chart_accounts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view fin_cost_centers" ON public.fin_cost_centers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_cost_centers" ON public.fin_cost_centers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_cost_centers" ON public.fin_cost_centers
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view fin_projects" ON public.fin_projects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_projects" ON public.fin_projects
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_projects" ON public.fin_projects
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view fin_ledger_entries" ON public.fin_ledger_entries
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_ledger_entries" ON public.fin_ledger_entries
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_ledger_entries" ON public.fin_ledger_entries
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view fin_payables" ON public.fin_payables
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_payables" ON public.fin_payables
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_payables" ON public.fin_payables
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view fin_receivables" ON public.fin_receivables
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_receivables" ON public.fin_receivables
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_receivables" ON public.fin_receivables
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view fin_bank_transactions" ON public.fin_bank_transactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_bank_transactions" ON public.fin_bank_transactions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_bank_transactions" ON public.fin_bank_transactions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view fin_reconciliation_links" ON public.fin_reconciliation_links
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_reconciliation_links" ON public.fin_reconciliation_links
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_reconciliation_links" ON public.fin_reconciliation_links
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete fin_reconciliation_links" ON public.fin_reconciliation_links
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view fin_budgets" ON public.fin_budgets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_budgets" ON public.fin_budgets
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_budgets" ON public.fin_budgets
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view fin_attachments" ON public.fin_attachments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_attachments" ON public.fin_attachments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete fin_attachments" ON public.fin_attachments
  FOR DELETE TO authenticated USING (uploaded_by = auth.uid());

CREATE POLICY "Authenticated users can view fin_audit_logs" ON public.fin_audit_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view fin_reconciliation_rules" ON public.fin_reconciliation_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fin_reconciliation_rules" ON public.fin_reconciliation_rules
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fin_reconciliation_rules" ON public.fin_reconciliation_rules
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete fin_reconciliation_rules" ON public.fin_reconciliation_rules
  FOR DELETE TO authenticated USING (true);

-- =============================================
-- DADOS INICIAIS - PLANO DE CONTAS DRE
-- =============================================
INSERT INTO public.fin_chart_accounts (code, name, nature, in_dre, dre_order) VALUES
('1', 'RECEITA BRUTA', 'RECEITA', true, 100),
('1.1', 'Vendas de Produtos', 'RECEITA', true, 110),
('1.2', 'Prestação de Serviços', 'RECEITA', true, 120),
('1.3', 'Outras Receitas', 'RECEITA', true, 130),
('2', 'DEDUÇÕES', 'RECEITA', true, 200),
('2.1', 'Impostos sobre Vendas', 'RECEITA', true, 210),
('2.2', 'Devoluções e Abatimentos', 'RECEITA', true, 220),
('3', 'CMV/CPV', 'DESPESA', true, 300),
('3.1', 'Custo dos Produtos Vendidos', 'DESPESA', true, 310),
('3.2', 'Custo dos Serviços Prestados', 'DESPESA', true, 320),
('4', 'DESPESAS OPERACIONAIS', 'DESPESA', true, 400),
('4.1', 'Despesas Administrativas', 'DESPESA', true, 410),
('4.2', 'Despesas Comerciais', 'DESPESA', true, 420),
('4.3', 'Despesas com Pessoal', 'DESPESA', true, 430),
('4.4', 'Despesas Tributárias', 'DESPESA', true, 440),
('5', 'RESULTADO FINANCEIRO', 'RESULTADO', true, 500),
('5.1', 'Receitas Financeiras', 'RECEITA', true, 510),
('5.2', 'Despesas Financeiras', 'DESPESA', true, 520),
('6', 'OUTRAS RECEITAS/DESPESAS', 'RESULTADO', true, 600),
('6.1', 'Outras Receitas Operacionais', 'RECEITA', true, 610),
('6.2', 'Outras Despesas Operacionais', 'DESPESA', true, 620);

-- Atualizar parent_id das contas filhas
UPDATE public.fin_chart_accounts SET parent_id = (SELECT id FROM public.fin_chart_accounts WHERE code = '1') WHERE code LIKE '1.%';
UPDATE public.fin_chart_accounts SET parent_id = (SELECT id FROM public.fin_chart_accounts WHERE code = '2') WHERE code LIKE '2.%';
UPDATE public.fin_chart_accounts SET parent_id = (SELECT id FROM public.fin_chart_accounts WHERE code = '3') WHERE code LIKE '3.%';
UPDATE public.fin_chart_accounts SET parent_id = (SELECT id FROM public.fin_chart_accounts WHERE code = '4') WHERE code LIKE '4.%';
UPDATE public.fin_chart_accounts SET parent_id = (SELECT id FROM public.fin_chart_accounts WHERE code = '5') WHERE code LIKE '5.%';
UPDATE public.fin_chart_accounts SET parent_id = (SELECT id FROM public.fin_chart_accounts WHERE code = '6') WHERE code LIKE '6.%';

-- =============================================
-- REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.fin_ledger_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fin_payables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fin_receivables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fin_bank_transactions;