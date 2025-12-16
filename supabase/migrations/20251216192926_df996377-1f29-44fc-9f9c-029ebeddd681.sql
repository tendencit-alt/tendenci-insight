-- Tabela para registro de metas diárias
CREATE TABLE IF NOT EXISTS tendenci_daily_goal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  meta_arquitetos INTEGER NOT NULL DEFAULT 5,
  realizado_arquitetos INTEGER DEFAULT 0,
  meta_valor DECIMAL(12,2),
  realizado_valor DECIMAL(12,2) DEFAULT 0,
  meta_batida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vendedor_id, data)
);

-- Enable RLS
ALTER TABLE tendenci_daily_goal_records ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own daily records" ON tendenci_daily_goal_records
  FOR SELECT USING (
    auth.uid() = vendedor_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own daily records" ON tendenci_daily_goal_records
  FOR INSERT WITH CHECK (auth.uid() = vendedor_id);

CREATE POLICY "Users can update own daily records" ON tendenci_daily_goal_records
  FOR UPDATE USING (
    auth.uid() = vendedor_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete daily records" ON tendenci_daily_goal_records
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_daily_goal_records_updated_at
  BEFORE UPDATE ON tendenci_daily_goal_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tendenci_daily_goal_records;

-- RPC para obter estatísticas de metas diárias
CREATE OR REPLACE FUNCTION get_daily_goal_stats(p_vendedor_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_current_streak INTEGER := 0;
  v_best_streak INTEGER := 0;
  v_temp_streak INTEGER := 0;
  v_total_met INTEGER := 0;
  v_avg_daily DECIMAL := 0;
  v_target_user_id UUID;
BEGIN
  -- Determinar qual usuário consultar
  v_target_user_id := COALESCE(p_vendedor_id, auth.uid());
  
  -- Calcular sequência atual (dias consecutivos com meta batida até hoje)
  WITH consecutive_days AS (
    SELECT 
      data,
      meta_batida,
      data - (ROW_NUMBER() OVER (ORDER BY data DESC))::INTEGER AS grp
    FROM tendenci_daily_goal_records
    WHERE vendedor_id = v_target_user_id
      AND meta_batida = true
      AND data <= CURRENT_DATE
    ORDER BY data DESC
  )
  SELECT COUNT(*) INTO v_current_streak
  FROM consecutive_days
  WHERE grp = (SELECT MIN(grp) FROM consecutive_days);
  
  -- Calcular melhor sequência histórica
  WITH streaks AS (
    SELECT 
      data,
      data - (ROW_NUMBER() OVER (ORDER BY data))::INTEGER AS grp
    FROM tendenci_daily_goal_records
    WHERE vendedor_id = v_target_user_id
      AND meta_batida = true
  )
  SELECT COALESCE(MAX(cnt), 0) INTO v_best_streak
  FROM (SELECT COUNT(*) as cnt FROM streaks GROUP BY grp) sub;
  
  -- Total de dias com meta batida
  SELECT COUNT(*) INTO v_total_met
  FROM tendenci_daily_goal_records
  WHERE vendedor_id = v_target_user_id
    AND meta_batida = true;
  
  -- Média diária dos últimos 30 dias
  SELECT COALESCE(AVG(realizado_arquitetos), 0) INTO v_avg_daily
  FROM tendenci_daily_goal_records
  WHERE vendedor_id = v_target_user_id
    AND data >= CURRENT_DATE - INTERVAL '30 days';
  
  result := json_build_object(
    'current_streak', COALESCE(v_current_streak, 0),
    'best_streak', COALESCE(v_best_streak, 0),
    'total_days_met', COALESCE(v_total_met, 0),
    'average_daily', COALESCE(v_avg_daily, 0)
  );
  
  RETURN result;
END;
$$;

-- RPC para obter registros do mês
CREATE OR REPLACE FUNCTION get_monthly_goal_records(
  p_vendedor_id UUID DEFAULT NULL,
  p_month DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date DATE,
  meta INTEGER,
  realizado INTEGER,
  batida BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user_id UUID;
BEGIN
  v_target_user_id := COALESCE(p_vendedor_id, auth.uid());
  
  RETURN QUERY
  SELECT 
    dgr.data::DATE as date,
    dgr.meta_arquitetos as meta,
    dgr.realizado_arquitetos as realizado,
    dgr.meta_batida as batida
  FROM tendenci_daily_goal_records dgr
  WHERE dgr.vendedor_id = v_target_user_id
    AND EXTRACT(MONTH FROM dgr.data) = EXTRACT(MONTH FROM p_month)
    AND EXTRACT(YEAR FROM dgr.data) = EXTRACT(YEAR FROM p_month)
  ORDER BY dgr.data;
END;
$$;