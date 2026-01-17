-- 1.4 Criar tabela fin_financial_goals para Metas (sem COALESCE no UNIQUE)
CREATE TABLE IF NOT EXISTS fin_financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('dre', 'cashflow')),
  metric_key TEXT NOT NULL,
  target_amount NUMERIC(15,2) NOT NULL,
  cost_center_id UUID REFERENCES fin_cost_centers(id) ON DELETE SET NULL,
  project_id UUID REFERENCES fin_projects(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar indice unico parcial para garantir unicidade
CREATE UNIQUE INDEX IF NOT EXISTS fin_financial_goals_unique_idx 
ON fin_financial_goals (year, month, goal_type, metric_key, 
  COALESCE(cost_center_id, '00000000-0000-0000-0000-000000000000'::uuid), 
  COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Habilitar RLS
ALTER TABLE fin_financial_goals ENABLE ROW LEVEL SECURITY;

-- Politicas RLS para fin_financial_goals
CREATE POLICY "Authenticated users can view goals" ON fin_financial_goals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert goals" ON fin_financial_goals
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update goals" ON fin_financial_goals
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete goals" ON fin_financial_goals
  FOR DELETE TO authenticated USING (true);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE fin_financial_goals;