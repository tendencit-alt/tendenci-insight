-- Corrigir função get_seller_goal_stats
CREATE OR REPLACE FUNCTION public.get_seller_goal_stats(p_vendedor_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      SELECT json_agg(badge_order.badge_data ORDER BY badge_order.earned_at DESC)
      FROM (
        SELECT json_build_object(
          'type', badge_type,
          'earned_at', earned_at,
          'percentual', percentual_atingido
        ) as badge_data,
        earned_at
        FROM tendenci_badges
        WHERE vendedor_id = p_vendedor_id
      ) badge_order
    )
  ) INTO result;
  
  RETURN result;
END;
$function$;
