-- Corrigir função get_seller_performance_by_goal
DROP FUNCTION IF EXISTS public.get_seller_performance_by_goal(UUID);

CREATE OR REPLACE FUNCTION public.get_seller_performance_by_goal(p_seller_goal_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_seller_goal RECORD;
  v_seller RECORD;
BEGIN
  -- Verificar se a meta existe
  SELECT * INTO v_seller_goal
  FROM tendenci_seller_goals
  WHERE id = p_seller_goal_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Meta não encontrada');
  END IF;
  
  -- Buscar informações do vendedor
  SELECT * INTO v_seller
  FROM profiles
  WHERE id = v_seller_goal.vendedor_id;
  
  -- Construir resultado
  SELECT json_build_object(
    'seller_info', json_build_object(
      'id', v_seller.id,
      'nome', v_seller.full_name,
      'email', v_seller.email,
      'avatar_url', v_seller.avatar_url,
      'cargo', v_seller.role
    ),
    'goal_info', json_build_object(
      'id', v_seller_goal.id,
      'valor_meta', v_seller_goal.valor_meta,
      'quantidade_meta', v_seller_goal.quantidade_meta,
      'tipo_meta', v_seller_goal.tipo_meta,
      'data_inicio', v_seller_goal.data_inicio,
      'data_fim', v_seller_goal.data_fim,
      'descricao', v_seller_goal.descricao,
      'status', v_seller_goal.status,
      'mes_referencia', TO_CHAR(v_seller_goal.data_inicio, 'TMMonth YYYY')
    ),
    'kpis', (
      SELECT json_build_object(
        'valor_vendido', COALESCE(SUM(d.value), 0),
        'percentual_meta', CASE 
          WHEN v_seller_goal.valor_meta > 0 THEN (COALESCE(SUM(d.value), 0) / v_seller_goal.valor_meta * 100)
          ELSE 0 
        END,
        'ticket_medio', CASE 
          WHEN COUNT(d.id) > 0 THEN COALESCE(SUM(d.value), 0) / COUNT(d.id)
          ELSE 0 
        END,
        'negocios_ganhos', COUNT(d.id),
        'negocios_perdidos', (
          SELECT COUNT(*) 
          FROM tendenci_deals 
          WHERE seller_id = v_seller_goal.vendedor_id 
          AND status = 'perdido'
          AND closed_date BETWEEN v_seller_goal.data_inicio AND v_seller_goal.data_fim
        ),
        'taxa_conversao', CASE 
          WHEN (SELECT COUNT(*) FROM tendenci_deals WHERE seller_id = v_seller_goal.vendedor_id AND closed_date BETWEEN v_seller_goal.data_inicio AND v_seller_goal.data_fim) > 0
          THEN (COUNT(d.id)::FLOAT / (SELECT COUNT(*) FROM tendenci_deals WHERE seller_id = v_seller_goal.vendedor_id AND closed_date BETWEEN v_seller_goal.data_inicio AND v_seller_goal.data_fim) * 100)
          ELSE 0 
        END
      )
      FROM tendenci_deals d
      WHERE d.seller_id = v_seller_goal.vendedor_id
      AND d.status = 'ganho'
      AND d.closed_date BETWEEN v_seller_goal.data_inicio AND v_seller_goal.data_fim
    ),
    'evolucao_diaria', (
      SELECT COALESCE(json_agg(daily ORDER BY daily.data), '[]'::json)
      FROM (
        SELECT 
          d.closed_date::date as data,
          SUM(d.value) as valor
        FROM tendenci_deals d
        WHERE d.seller_id = v_seller_goal.vendedor_id
        AND d.status = 'ganho'
        AND d.closed_date BETWEEN v_seller_goal.data_inicio AND v_seller_goal.data_fim
        GROUP BY d.closed_date::date
        ORDER BY d.closed_date::date
      ) daily
    ),
    'origem_leads', (
      SELECT COALESCE(json_agg(origem), '[]'::json)
      FROM (
        SELECT 
          COALESCE(l.source, 'Não informado') as origem,
          COUNT(*) as quantidade
        FROM tendenci_leads l
        WHERE l.seller_id = v_seller_goal.vendedor_id
        AND l.created_at BETWEEN v_seller_goal.data_inicio AND v_seller_goal.data_fim
        GROUP BY l.source
      ) origem
    ),
    'produtos_vendidos', (
      SELECT COALESCE(json_agg(produtos), '[]'::json)
      FROM (
        SELECT 
          COALESCE(d.product_category, 'Sem categoria') as categoria,
          COUNT(*) as quantidade,
          SUM(d.value) as total_vendido,
          AVG(d.value) as ticket_medio
        FROM tendenci_deals d
        WHERE d.seller_id = v_seller_goal.vendedor_id
        AND d.status = 'ganho'
        AND d.closed_date BETWEEN v_seller_goal.data_inicio AND v_seller_goal.data_fim
        GROUP BY d.product_category
      ) produtos
    ),
    'arquitetos_vendas', (
      SELECT COALESCE(json_agg(arq), '[]'::json)
      FROM (
        SELECT 
          a.nome as arquiteto,
          a.id as arquiteto_id,
          COUNT(d.id) as quantidade,
          SUM(d.value) as total_vendido
        FROM tendenci_deals d
        INNER JOIN tendenci_architects a ON d.architect_id = a.id
        WHERE d.seller_id = v_seller_goal.vendedor_id
        AND d.status = 'ganho'
        AND d.closed_date BETWEEN v_seller_goal.data_inicio AND v_seller_goal.data_fim
        GROUP BY a.nome, a.id
      ) arq
    ),
    'arquitetos_resumo', (
      SELECT json_build_object(
        'total_arquitetos', COUNT(DISTINCT d.architect_id),
        'total_vendido_arquitetos', COALESCE(SUM(d.value), 0),
        'projetos_finalizados', COUNT(d.id)
      )
      FROM tendenci_deals d
      WHERE d.seller_id = v_seller_goal.vendedor_id
      AND d.status = 'ganho'
      AND d.architect_id IS NOT NULL
      AND d.closed_date BETWEEN v_seller_goal.data_inicio AND v_seller_goal.data_fim
    ),
    'negocios_ganhos_detalhes', (
      SELECT COALESCE(json_agg(deals), '[]'::json)
      FROM (
        SELECT 
          d.id,
          d.title,
          d.client_name as cliente,
          d.value,
          d.closed_date as data_fechamento,
          d.product_category as categoria_produto,
          CASE WHEN d.architect_id IS NOT NULL THEN true ELSE false END as tem_arquiteto,
          a.nome as arquiteto_nome
        FROM tendenci_deals d
        LEFT JOIN tendenci_architects a ON d.architect_id = a.id
        WHERE d.seller_id = v_seller_goal.vendedor_id
        AND d.status = 'ganho'
        AND d.closed_date BETWEEN v_seller_goal.data_inicio AND v_seller_goal.data_fim
        ORDER BY d.closed_date DESC
      ) deals
    ),
    'conversao_por_origem', (
      SELECT COALESCE(json_agg(conv), '[]'::json)
      FROM (
        SELECT 
          COALESCE(l.source, 'Não informado') as origem,
          COUNT(l.id) as leads_recebidos,
          COUNT(CASE WHEN l.status != 'novo' THEN 1 END) as leads_trabalhados,
          COUNT(d.id) as leads_ganhos,
          CASE 
            WHEN COUNT(l.id) > 0 THEN (COUNT(d.id)::FLOAT / COUNT(l.id) * 100)
            ELSE 0 
          END as taxa_conversao,
          CASE 
            WHEN COUNT(d.id) > 0 THEN AVG(d.value)
            ELSE 0 
          END as ticket_medio
        FROM tendenci_leads l
        LEFT JOIN tendenci_deals d ON l.id = d.lead_id AND d.status = 'ganho'
        WHERE l.seller_id = v_seller_goal.vendedor_id
        AND l.created_at BETWEEN v_seller_goal.data_inicio AND v_seller_goal.data_fim
        GROUP BY l.source
      ) conv
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;