-- 1.5 Criar tabela fin_loan_contracts para Contratos de Emprestimos
CREATE TABLE IF NOT EXISTS fin_loan_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  principal_amount NUMERIC(15,2) NOT NULL,
  interest_rate NUMERIC(8,4),
  start_date DATE NOT NULL,
  end_date DATE,
  installments INTEGER,
  status TEXT DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'QUITADO', 'CANCELADO')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE fin_loan_contracts ENABLE ROW LEVEL SECURITY;

-- Politicas RLS para fin_loan_contracts
CREATE POLICY "Authenticated users can view contracts" ON fin_loan_contracts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert contracts" ON fin_loan_contracts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contracts" ON fin_loan_contracts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete contracts" ON fin_loan_contracts
  FOR DELETE TO authenticated USING (true);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE fin_loan_contracts;

-- 1.6 Adicionar referencia de contrato nos lancamentos
ALTER TABLE fin_ledger_entries 
ADD COLUMN IF NOT EXISTS loan_contract_id UUID REFERENCES fin_loan_contracts(id) ON DELETE SET NULL;