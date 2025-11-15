-- Criar tabela para metas diárias de captação de arquitetos
CREATE TABLE IF NOT EXISTS public.tendenci_daily_architect_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  meta_captacoes INTEGER NOT NULL DEFAULT 30,
  captacoes_realizadas INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(vendedor_id, data)
);

-- Criar índices para melhor performance
CREATE INDEX idx_daily_architect_goals_vendedor ON public.tendenci_daily_architect_goals(vendedor_id);
CREATE INDEX idx_daily_architect_goals_data ON public.tendenci_daily_architect_goals(data);

-- Habilitar RLS
ALTER TABLE public.tendenci_daily_architect_goals ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Vendedores veem suas próprias metas diárias"
  ON public.tendenci_daily_architect_goals
  FOR SELECT
  USING (auth.uid() = vendedor_id OR is_admin());

CREATE POLICY "Sistema cria metas diárias"
  ON public.tendenci_daily_architect_goals
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Sistema atualiza metas diárias"
  ON public.tendenci_daily_architect_goals
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Função para criar metas diárias automaticamente para dias úteis (seg-sex)
CREATE OR REPLACE FUNCTION public.create_daily_architect_goals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_date DATE := CURRENT_DATE;
  v_vendedor RECORD;
BEGIN
  -- Verificar se é dia útil (segunda a sexta)
  IF EXTRACT(DOW FROM v_date) BETWEEN 1 AND 5 THEN
    -- Para cada vendedor ativo
    FOR v_vendedor IN 
      SELECT id FROM profiles WHERE role IN ('vendedor', 'admin')
    LOOP
      -- Inserir meta diária se não existir
      INSERT INTO tendenci_daily_architect_goals (vendedor_id, data, meta_captacoes, captacoes_realizadas)
      VALUES (v_vendedor.id, v_date, 30, 0)
      ON CONFLICT (vendedor_id, data) DO NOTHING;
    END LOOP;
  END IF;
END;
$$;

-- Função para atualizar captações realizadas quando um novo arquiteto é criado
CREATE OR REPLACE FUNCTION public.update_daily_architect_goal_on_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Atualizar contador de captações do dia
  INSERT INTO tendenci_daily_architect_goals (vendedor_id, data, meta_captacoes, captacoes_realizadas)
  VALUES (
    COALESCE(NEW.created_by, NEW.vendedor_responsavel, auth.uid()), 
    CURRENT_DATE, 
    30, 
    1
  )
  ON CONFLICT (vendedor_id, data) 
  DO UPDATE SET 
    captacoes_realizadas = tendenci_daily_architect_goals.captacoes_realizadas + 1,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Criar trigger para atualizar captações quando arquiteto é criado
DROP TRIGGER IF EXISTS trg_update_daily_goal_on_architect_creation ON public.architects;
CREATE TRIGGER trg_update_daily_goal_on_architect_creation
  AFTER INSERT ON public.architects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_architect_goal_on_creation();

-- Função para obter progresso diário de captação de um vendedor
CREATE OR REPLACE FUNCTION public.get_daily_architect_goal_progress(p_vendedor_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'data', p_date,
    'meta', COALESCE(dg.meta_captacoes, 30),
    'realizadas', COALESCE(dg.captacoes_realizadas, 0),
    'percentual', CASE 
      WHEN COALESCE(dg.meta_captacoes, 30) > 0 
      THEN ROUND((COALESCE(dg.captacoes_realizadas, 0)::NUMERIC / COALESCE(dg.meta_captacoes, 30)) * 100, 1)
      ELSE 0 
    END,
    'faltam', GREATEST(0, COALESCE(dg.meta_captacoes, 30) - COALESCE(dg.captacoes_realizadas, 0)),
    'atingiu_meta', COALESCE(dg.captacoes_realizadas, 0) >= COALESCE(dg.meta_captacoes, 30)
  ) INTO v_result
  FROM tendenci_daily_architect_goals dg
  WHERE dg.vendedor_id = p_vendedor_id AND dg.data = p_date;
  
  -- Se não existe registro, retornar meta padrão
  IF v_result IS NULL THEN
    v_result := json_build_object(
      'data', p_date,
      'meta', 30,
      'realizadas', 0,
      'percentual', 0,
      'faltam', 30,
      'atingiu_meta', false
    );
  END IF;
  
  RETURN v_result;
END;
$$;

-- Função para obter progresso semanal
CREATE OR REPLACE FUNCTION public.get_weekly_architect_goal_progress(p_vendedor_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Calcular início e fim da semana (segunda a sexta)
  v_start_date := date_trunc('week', CURRENT_DATE)::DATE + 1; -- Segunda-feira
  v_end_date := v_start_date + 4; -- Sexta-feira
  
  SELECT json_build_object(
    'semana_inicio', v_start_date,
    'semana_fim', v_end_date,
    'meta_total', 150, -- 30 captações x 5 dias
    'realizadas_total', COALESCE(SUM(captacoes_realizadas), 0),
    'percentual', CASE 
      WHEN 150 > 0 
      THEN ROUND((COALESCE(SUM(captacoes_realizadas), 0)::NUMERIC / 150) * 100, 1)
      ELSE 0 
    END,
    'dias_uteis', 5,
    'media_diaria', CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND(COALESCE(SUM(captacoes_realizadas), 0)::NUMERIC / COUNT(*), 1)
      ELSE 0 
    END,
    'dias_meta_atingida', COUNT(*) FILTER (WHERE captacoes_realizadas >= meta_captacoes),
    'detalhes_dias', COALESCE(
      json_agg(
        json_build_object(
          'data', data,
          'meta', meta_captacoes,
          'realizadas', captacoes_realizadas,
          'percentual', ROUND((captacoes_realizadas::NUMERIC / meta_captacoes) * 100, 1)
        ) ORDER BY data
      ),
      '[]'::json
    )
  ) INTO v_result
  FROM tendenci_daily_architect_goals
  WHERE vendedor_id = p_vendedor_id
    AND data BETWEEN v_start_date AND v_end_date;
    
  RETURN v_result;
END;
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_daily_architect_goals_updated_at
  BEFORE UPDATE ON public.tendenci_daily_architect_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.tendenci_daily_architect_goals IS 'Metas diárias fixas de captação de arquitetos (30 por dia, seg-sex)';
COMMENT ON FUNCTION public.create_daily_architect_goals() IS 'Cria automaticamente metas diárias para todos os vendedores em dias úteis';
COMMENT ON FUNCTION public.update_daily_architect_goal_on_creation() IS 'Atualiza contador de captações quando novo arquiteto é criado';
COMMENT ON FUNCTION public.get_daily_architect_goal_progress(UUID, DATE) IS 'Retorna progresso diário de captação de um vendedor';
COMMENT ON FUNCTION public.get_weekly_architect_goal_progress(UUID) IS 'Retorna progresso semanal de captação de um vendedor';