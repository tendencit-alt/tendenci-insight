-- Criar tabela de metas consolidadas da empresa
CREATE TABLE IF NOT EXISTS public.tendenci_company_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valor_meta_total NUMERIC NOT NULL,
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
  descricao TEXT,
  criado_por UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'concluida', 'cancelada')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de metas individuais dos vendedores
CREATE TABLE IF NOT EXISTS public.tendenci_seller_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  valor_meta NUMERIC NOT NULL,
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
  descricao TEXT,
  criado_por UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'concluida', 'cancelada')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de progresso das metas
CREATE TABLE IF NOT EXISTS public.tendenci_goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_goal_id UUID REFERENCES tendenci_seller_goals(id) ON DELETE CASCADE,
  company_goal_id UUID REFERENCES tendenci_company_goals(id) ON DELETE CASCADE,
  valor_vendido NUMERIC DEFAULT 0,
  percentual NUMERIC DEFAULT 0,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT check_goal_reference CHECK (
    (seller_goal_id IS NOT NULL AND company_goal_id IS NULL) OR
    (seller_goal_id IS NULL AND company_goal_id IS NOT NULL)
  )
);

-- Criar tabela de ranking dos vendedores
CREATE TABLE IF NOT EXISTS public.tendenci_seller_ranking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  posicao_atual INTEGER,
  percentual_meta_atualizado NUMERIC DEFAULT 0,
  valor_total_vendido NUMERIC DEFAULT 0,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  periodo_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  periodo_fim TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(vendedor_id, periodo_inicio, periodo_fim)
);

-- Criar tabela de insígnias
CREATE TABLE IF NOT EXISTS public.tendenci_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('start_meta', 'meio_caminho', 'virada_meta', 'atingiu_meta', 'meta_explodida', 'closer_mes')),
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  seller_goal_id UUID REFERENCES tendenci_seller_goals(id) ON DELETE CASCADE,
  percentual_atingido NUMERIC
);

-- Enable RLS
ALTER TABLE public.tendenci_company_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tendenci_seller_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tendenci_goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tendenci_seller_ranking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tendenci_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies para metas da empresa
CREATE POLICY "Masters podem gerenciar metas da empresa"
ON public.tendenci_company_goals
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Vendedores podem ver metas da empresa"
ON public.tendenci_company_goals
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS Policies para metas dos vendedores
CREATE POLICY "Masters podem gerenciar todas as metas individuais"
ON public.tendenci_seller_goals
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Vendedores podem ver apenas suas próprias metas"
ON public.tendenci_seller_goals
FOR SELECT
USING (vendedor_id = auth.uid());

-- RLS Policies para progresso
CREATE POLICY "Masters podem ver todo o progresso"
ON public.tendenci_goal_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Vendedores podem ver apenas seu progresso"
ON public.tendenci_goal_progress
FOR SELECT
USING (
  seller_goal_id IN (
    SELECT id FROM tendenci_seller_goals 
    WHERE vendedor_id = auth.uid()
  ) OR company_goal_id IS NOT NULL
);

-- RLS Policies para ranking
CREATE POLICY "Masters podem ver todo o ranking"
ON public.tendenci_seller_ranking
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Vendedores podem ver apenas seu próprio ranking"
ON public.tendenci_seller_ranking
FOR SELECT
USING (vendedor_id = auth.uid());

-- RLS Policies para insígnias
CREATE POLICY "Masters podem ver todas as insígnias"
ON public.tendenci_badges
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Vendedores podem ver apenas suas insígnias"
ON public.tendenci_badges
FOR SELECT
USING (vendedor_id = auth.uid());

CREATE POLICY "Sistema pode criar insígnias"
ON public.tendenci_badges
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Função para atualizar progresso das metas quando um deal é ganho
CREATE OR REPLACE FUNCTION update_goal_progress_on_deal_won()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id UUID;
  v_deal_value NUMERIC;
  v_active_seller_goal UUID;
  v_active_company_goal UUID;
  v_current_progress NUMERIC;
  v_goal_value NUMERIC;
  v_new_percentual NUMERIC;
BEGIN
  -- Apenas processar quando status mudar para 'won'
  IF NEW.status = 'won' AND (OLD.status IS NULL OR OLD.status != 'won') THEN
    v_deal_value := NEW.value;
    v_seller_id := NEW.owner_id;
    
    -- Buscar meta ativa do vendedor
    SELECT id, valor_meta INTO v_active_seller_goal, v_goal_value
    FROM tendenci_seller_goals
    WHERE vendedor_id = v_seller_id
      AND status = 'ativa'
      AND now() BETWEEN data_inicio AND data_fim
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Atualizar progresso da meta individual
    IF v_active_seller_goal IS NOT NULL THEN
      -- Verificar se já existe progresso
      SELECT valor_vendido INTO v_current_progress
      FROM tendenci_goal_progress
      WHERE seller_goal_id = v_active_seller_goal;
      
      IF v_current_progress IS NULL THEN
        -- Criar novo progresso
        INSERT INTO tendenci_goal_progress (seller_goal_id, valor_vendido, percentual)
        VALUES (v_active_seller_goal, v_deal_value, (v_deal_value / v_goal_value * 100));
      ELSE
        -- Atualizar progresso existente
        v_current_progress := v_current_progress + v_deal_value;
        v_new_percentual := (v_current_progress / v_goal_value * 100);
        
        UPDATE tendenci_goal_progress
        SET valor_vendido = v_current_progress,
            percentual = v_new_percentual,
            atualizado_em = now()
        WHERE seller_goal_id = v_active_seller_goal;
        
        -- Conceder insígnias automaticamente
        IF v_new_percentual >= 10 AND NOT EXISTS (
          SELECT 1 FROM tendenci_badges 
          WHERE vendedor_id = v_seller_id 
          AND badge_type = 'start_meta' 
          AND seller_goal_id = v_active_seller_goal
        ) THEN
          INSERT INTO tendenci_badges (vendedor_id, badge_type, seller_goal_id, percentual_atingido)
          VALUES (v_seller_id, 'start_meta', v_active_seller_goal, v_new_percentual);
        END IF;
        
        IF v_new_percentual >= 50 AND NOT EXISTS (
          SELECT 1 FROM tendenci_badges 
          WHERE vendedor_id = v_seller_id 
          AND badge_type = 'meio_caminho' 
          AND seller_goal_id = v_active_seller_goal
        ) THEN
          INSERT INTO tendenci_badges (vendedor_id, badge_type, seller_goal_id, percentual_atingido)
          VALUES (v_seller_id, 'meio_caminho', v_active_seller_goal, v_new_percentual);
        END IF;
        
        IF v_new_percentual >= 70 AND NOT EXISTS (
          SELECT 1 FROM tendenci_badges 
          WHERE vendedor_id = v_seller_id 
          AND badge_type = 'virada_meta' 
          AND seller_goal_id = v_active_seller_goal
        ) THEN
          INSERT INTO tendenci_badges (vendedor_id, badge_type, seller_goal_id, percentual_atingido)
          VALUES (v_seller_id, 'virada_meta', v_active_seller_goal, v_new_percentual);
        END IF;
        
        IF v_new_percentual >= 100 AND NOT EXISTS (
          SELECT 1 FROM tendenci_badges 
          WHERE vendedor_id = v_seller_id 
          AND badge_type = 'atingiu_meta' 
          AND seller_goal_id = v_active_seller_goal
        ) THEN
          INSERT INTO tendenci_badges (vendedor_id, badge_type, seller_goal_id, percentual_atingido)
          VALUES (v_seller_id, 'atingiu_meta', v_active_seller_goal, v_new_percentual);
        END IF;
        
        IF v_new_percentual >= 120 AND NOT EXISTS (
          SELECT 1 FROM tendenci_badges 
          WHERE vendedor_id = v_seller_id 
          AND badge_type = 'meta_explodida' 
          AND seller_goal_id = v_active_seller_goal
        ) THEN
          INSERT INTO tendenci_badges (vendedor_id, badge_type, seller_goal_id, percentual_atingido)
          VALUES (v_seller_id, 'meta_explodida', v_active_seller_goal, v_new_percentual);
        END IF;
      END IF;
      
      -- Atualizar ranking
      INSERT INTO tendenci_seller_ranking (
        vendedor_id, 
        percentual_meta_atualizado, 
        valor_total_vendido,
        periodo_inicio,
        periodo_fim
      )
      SELECT 
        v_seller_id,
        v_new_percentual,
        v_current_progress,
        (SELECT data_inicio FROM tendenci_seller_goals WHERE id = v_active_seller_goal),
        (SELECT data_fim FROM tendenci_seller_goals WHERE id = v_active_seller_goal)
      ON CONFLICT (vendedor_id, periodo_inicio, periodo_fim) 
      DO UPDATE SET
        percentual_meta_atualizado = EXCLUDED.percentual_meta_atualizado,
        valor_total_vendido = EXCLUDED.valor_total_vendido,
        atualizado_em = now();
    END IF;
    
    -- Buscar meta ativa da empresa
    SELECT id, valor_meta_total INTO v_active_company_goal, v_goal_value
    FROM tendenci_company_goals
    WHERE status = 'ativa'
      AND now() BETWEEN data_inicio AND data_fim
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Atualizar progresso da meta consolidada
    IF v_active_company_goal IS NOT NULL THEN
      SELECT valor_vendido INTO v_current_progress
      FROM tendenci_goal_progress
      WHERE company_goal_id = v_active_company_goal;
      
      IF v_current_progress IS NULL THEN
        INSERT INTO tendenci_goal_progress (company_goal_id, valor_vendido, percentual)
        VALUES (v_active_company_goal, v_deal_value, (v_deal_value / v_goal_value * 100));
      ELSE
        v_current_progress := v_current_progress + v_deal_value;
        UPDATE tendenci_goal_progress
        SET valor_vendido = v_current_progress,
            percentual = (v_current_progress / v_goal_value * 100),
            atualizado_em = now()
        WHERE company_goal_id = v_active_company_goal;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para atualizar metas quando deal é ganho
DROP TRIGGER IF EXISTS trigger_update_goals_on_deal_won ON crm_deals;
CREATE TRIGGER trigger_update_goals_on_deal_won
AFTER UPDATE ON crm_deals
FOR EACH ROW
EXECUTE FUNCTION update_goal_progress_on_deal_won();

-- Função para calcular ranking automaticamente
CREATE OR REPLACE FUNCTION calculate_seller_rankings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar posições do ranking
  WITH ranked_sellers AS (
    SELECT 
      vendedor_id,
      periodo_inicio,
      periodo_fim,
      ROW_NUMBER() OVER (
        PARTITION BY periodo_inicio, periodo_fim 
        ORDER BY percentual_meta_atualizado DESC, valor_total_vendido DESC
      ) as nova_posicao
    FROM tendenci_seller_ranking
  )
  UPDATE tendenci_seller_ranking r
  SET posicao_atual = rs.nova_posicao,
      atualizado_em = now()
  FROM ranked_sellers rs
  WHERE r.vendedor_id = rs.vendedor_id
    AND r.periodo_inicio = rs.periodo_inicio
    AND r.periodo_fim = rs.periodo_fim;
END;
$$;

-- Função para obter estatísticas do vendedor
CREATE OR REPLACE FUNCTION get_seller_goal_stats(p_vendedor_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'meta_ativa', (
      SELECT json_build_object(
        'id', sg.id,
        'valor_meta', sg.valor_meta,
        'data_inicio', sg.data_inicio,
        'data_fim', sg.data_fim,
        'descricao', sg.descricao,
        'valor_vendido', COALESCE(gp.valor_vendido, 0),
        'percentual', COALESCE(gp.percentual, 0)
      )
      FROM tendenci_seller_goals sg
      LEFT JOIN tendenci_goal_progress gp ON gp.seller_goal_id = sg.id
      WHERE sg.vendedor_id = p_vendedor_id
        AND sg.status = 'ativa'
        AND now() BETWEEN sg.data_inicio AND sg.data_fim
      ORDER BY sg.created_at DESC
      LIMIT 1
    ),
    'ranking', (
      SELECT json_build_object(
        'posicao', posicao_atual,
        'total_vendedores', (
          SELECT COUNT(DISTINCT vendedor_id) 
          FROM tendenci_seller_ranking 
          WHERE periodo_inicio = r.periodo_inicio 
          AND periodo_fim = r.periodo_fim
        )
      )
      FROM tendenci_seller_ranking r
      WHERE r.vendedor_id = p_vendedor_id
      ORDER BY r.atualizado_em DESC
      LIMIT 1
    ),
    'insignias', (
      SELECT json_agg(
        json_build_object(
          'type', badge_type,
          'earned_at', earned_at,
          'percentual', percentual_atingido
        )
      )
      FROM tendenci_badges
      WHERE vendedor_id = p_vendedor_id
      ORDER BY earned_at DESC
    )
  ) INTO result;
  
  RETURN result;
END;
$$;