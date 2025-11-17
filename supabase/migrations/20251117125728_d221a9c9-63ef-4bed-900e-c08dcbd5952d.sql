-- Corrigir/criar a função get_seller_goal_stats para calcular metas corretamente
CREATE OR REPLACE FUNCTION get_seller_goal_stats(p_vendedor_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_meta_ativa RECORD;
  v_valor_vendido NUMERIC := 0;
  v_percentual NUMERIC := 0;
  v_posicao INT := 0;
  v_total_vendedores INT := 0;
BEGIN
  -- Buscar meta ativa do vendedor
  SELECT 
    tsg.id,
    tsg.valor_meta,
    tsg.data_inicio,
    tsg.data_fim,
    tsg.descricao
  INTO v_meta_ativa
  FROM tendenci_seller_goals tsg
  WHERE tsg.vendedor_id = p_vendedor_id
    AND tsg.status = 'ativa'
    AND tsg.data_fim >= CURRENT_DATE
  ORDER BY tsg.created_at DESC
  LIMIT 1;

  -- Se não há meta ativa, retornar null
  IF v_meta_ativa.id IS NULL THEN
    RETURN json_build_object(
      'meta_ativa', NULL,
      'ranking', NULL,
      'insignias', NULL
    );
  END IF;

  -- Calcular valor vendido (soma de deals ganhos do vendedor no período da meta)
  SELECT COALESCE(SUM(cd.value), 0)
  INTO v_valor_vendido
  FROM crm_deals cd
  WHERE cd.owner_id = p_vendedor_id
    AND cd.status = 'won'
    AND cd.updated_at >= v_meta_ativa.data_inicio
    AND cd.updated_at <= v_meta_ativa.data_fim;

  -- Calcular percentual
  IF v_meta_ativa.valor_meta > 0 THEN
    v_percentual := (v_valor_vendido / v_meta_ativa.valor_meta) * 100;
  END IF;

  -- Atualizar/criar registro de progresso na tabela tendenci_goal_progress
  INSERT INTO tendenci_goal_progress (
    seller_goal_id,
    valor_vendido,
    percentual,
    atualizado_em
  )
  VALUES (
    v_meta_ativa.id,
    v_valor_vendido,
    v_percentual,
    NOW()
  )
  ON CONFLICT (seller_goal_id)
  DO UPDATE SET
    valor_vendido = v_valor_vendido,
    percentual = v_percentual,
    atualizado_em = NOW();

  -- Calcular ranking (posição entre vendedores)
  WITH vendedor_ranking AS (
    SELECT 
      tsg.vendedor_id,
      COALESCE(SUM(cd.value), 0) as total_vendido,
      DENSE_RANK() OVER (ORDER BY COALESCE(SUM(cd.value), 0) DESC) as posicao
    FROM tendenci_seller_goals tsg
    LEFT JOIN crm_deals cd ON cd.owner_id = tsg.vendedor_id 
      AND cd.status = 'won'
      AND cd.updated_at >= tsg.data_inicio
      AND cd.updated_at <= tsg.data_fim
    WHERE tsg.status = 'ativa'
      AND tsg.data_fim >= CURRENT_DATE
    GROUP BY tsg.vendedor_id
  )
  SELECT 
    posicao,
    (SELECT COUNT(DISTINCT vendedor_id) FROM vendedor_ranking) as total
  INTO v_posicao, v_total_vendedores
  FROM vendedor_ranking
  WHERE vendedor_id = p_vendedor_id;

  -- Buscar insígnias do vendedor
  v_result := json_build_object(
    'meta_ativa', json_build_object(
      'id', v_meta_ativa.id,
      'valor_meta', v_meta_ativa.valor_meta,
      'data_inicio', v_meta_ativa.data_inicio,
      'data_fim', v_meta_ativa.data_fim,
      'descricao', v_meta_ativa.descricao,
      'valor_vendido', v_valor_vendido,
      'percentual', v_percentual
    ),
    'ranking', json_build_object(
      'posicao', COALESCE(v_posicao, 0),
      'total_vendedores', COALESCE(v_total_vendedores, 0)
    ),
    'insignias', (
      SELECT COALESCE(json_agg(json_build_object(
        'type', badge_type,
        'earned_at', earned_at,
        'percentual', percentual_atingido
      )), '[]'::json)
      FROM tendenci_badges
      WHERE vendedor_id = p_vendedor_id
      ORDER BY earned_at DESC
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para atualizar automaticamente o progresso quando deal muda para "won"
CREATE OR REPLACE FUNCTION update_seller_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar o progresso de todos os vendedores que têm metas ativas
  -- quando um deal é marcado como won ou o valor é alterado
  IF (TG_OP = 'UPDATE' AND NEW.status = 'won' AND OLD.status != 'won') OR
     (TG_OP = 'UPDATE' AND NEW.status = 'won' AND NEW.value != OLD.value) THEN
    
    -- Recalcular stats do vendedor que possui este deal
    PERFORM get_seller_goal_stats(NEW.owner_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_update_seller_goal_progress ON crm_deals;

-- Criar novo trigger
CREATE TRIGGER trigger_update_seller_goal_progress
  AFTER UPDATE ON crm_deals
  FOR EACH ROW
  WHEN (NEW.status = 'won')
  EXECUTE FUNCTION update_seller_goal_progress();

COMMENT ON FUNCTION get_seller_goal_stats IS 'Calcula estatísticas de meta do vendedor incluindo valor vendido de deals ganhos';
COMMENT ON FUNCTION update_seller_goal_progress IS 'Atualiza automaticamente o progresso da meta quando deal é marcado como ganho';