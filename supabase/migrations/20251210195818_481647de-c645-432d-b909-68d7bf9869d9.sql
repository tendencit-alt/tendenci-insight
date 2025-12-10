-- Drop função existente para poder recriar com novo retorno
DROP FUNCTION IF EXISTS public.get_sellers_without_goals();

-- Recriar função que retorna contagem de vendedores sem meta ativa
CREATE OR REPLACE FUNCTION public.get_sellers_without_goals()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM profiles p
  WHERE p.role IN ('vendedor', 'admin')
    AND NOT EXISTS (
      SELECT 1 FROM tendenci_seller_goals tsg
      WHERE tsg.vendedor_id = p.id
        AND tsg.status = 'ativa'
        AND CURRENT_DATE BETWEEN tsg.data_inicio AND tsg.data_fim
    );
  
  RETURN v_count;
END;
$function$;

-- Drop e recriar função de recálculo
DROP FUNCTION IF EXISTS public.recalculate_all_goal_progress();

CREATE OR REPLACE FUNCTION public.recalculate_all_goal_progress()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_goal RECORD;
  v_valor_vendido NUMERIC;
  v_percentual NUMERIC;
BEGIN
  -- Para cada meta ativa de vendedor
  FOR v_goal IN 
    SELECT id, vendedor_id, valor_meta, data_inicio, data_fim
    FROM tendenci_seller_goals
    WHERE status = 'ativa'
  LOOP
    -- Calcular valor vendido real no período da meta
    SELECT COALESCE(SUM(value), 0) INTO v_valor_vendido
    FROM crm_deals
    WHERE owner_id = v_goal.vendedor_id
      AND status = 'won'
      AND updated_at >= v_goal.data_inicio
      AND updated_at <= v_goal.data_fim;
    
    -- Calcular percentual
    IF v_goal.valor_meta > 0 THEN
      v_percentual := (v_valor_vendido / v_goal.valor_meta) * 100;
    ELSE
      v_percentual := 0;
    END IF;
    
    -- Atualizar ou inserir progresso
    INSERT INTO tendenci_goal_progress (seller_goal_id, valor_vendido, percentual, atualizado_em)
    VALUES (v_goal.id, v_valor_vendido, v_percentual, NOW())
    ON CONFLICT (seller_goal_id) 
    DO UPDATE SET 
      valor_vendido = v_valor_vendido,
      percentual = v_percentual,
      atualizado_em = NOW();
  END LOOP;
END;
$function$;