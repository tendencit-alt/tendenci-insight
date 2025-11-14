-- Criar função RPC para buscar dados completos do desempenho do vendedor em uma meta específica
CREATE OR REPLACE FUNCTION public.get_seller_performance_by_goal(
  p_seller_goal_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_seller_id UUID;
  v_data_inicio TIMESTAMP WITH TIME ZONE;
  v_data_fim TIMESTAMP WITH TIME ZONE;
  v_valor_meta NUMERIC;
BEGIN
  -- Buscar informações da meta
  SELECT vendedor_id, data_inicio, data_fim, valor_meta
  INTO v_seller_id, v_data_inicio, v_data_fim, v_valor_meta
  FROM tendenci_seller_goals
  WHERE id = p_seller_goal_id;

  IF v_seller_id IS NULL THEN
    RETURN json_build_object('error', 'Meta não encontrada');
  END IF;

  -- Montar JSON completo com todos os dados
  SELECT json_build_object(
    'seller_info', (
      SELECT json_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'email', p.email,
        'avatar_url', p.avatar_url,
        'role', p.role
      )
      FROM profiles p
      WHERE p.id = v_seller_id
    ),
    'goal_info', (
      SELECT json_build_object(
        'id', sg.id,
        'valor_meta', sg.valor_meta,
        'data_inicio', sg.data_inicio,
        'data_fim', sg.data_fim,
        'descricao', sg.descricao,
        'status', sg.status,
        'tipo_meta', sg.tipo_meta,
        'valor_vendido', COALESCE(gp.valor_vendido, 0),
        'percentual', COALESCE(gp.percentual, 0)
      )
      FROM tendenci_seller_goals sg
      LEFT JOIN tendenci_goal_progress gp ON gp.seller_goal_id = sg.id
      WHERE sg.id = p_seller_goal_id
    ),
    'kpis', json_build_object(
      'vendas_totais', COALESCE((
        SELECT SUM(value)
        FROM crm_deals
        WHERE owner_id = v_seller_id
          AND status = 'won'
          AND updated_at BETWEEN v_data_inicio AND v_data_fim
      ), 0),
      'negocios_ganhos', COALESCE((
        SELECT COUNT(*)
        FROM crm_deals
        WHERE owner_id = v_seller_id
          AND status = 'won'
          AND updated_at BETWEEN v_data_inicio AND v_data_fim
      ), 0),
      'negocios_perdidos', COALESCE((
        SELECT COUNT(*)
        FROM crm_deals
        WHERE owner_id = v_seller_id
          AND status = 'lost'
          AND updated_at BETWEEN v_data_inicio AND v_data_fim
      ), 0),
      'negocios_abertos', COALESCE((
        SELECT COUNT(*)
        FROM crm_deals
        WHERE owner_id = v_seller_id
          AND status = 'aberto'
          AND created_at BETWEEN v_data_inicio AND v_data_fim
      ), 0),
      'ticket_medio', COALESCE((
        SELECT ROUND(AVG(value), 2)
        FROM crm_deals
        WHERE owner_id = v_seller_id
          AND status = 'won'
          AND updated_at BETWEEN v_data_inicio AND v_data_fim
      ), 0),
      'conversao_percentual', CASE
        WHEN (
          SELECT COUNT(*)
          FROM crm_deals
          WHERE owner_id = v_seller_id
            AND created_at BETWEEN v_data_inicio AND v_data_fim
        ) > 0
        THEN ROUND((
          SELECT COUNT(*)::NUMERIC
          FROM crm_deals
          WHERE owner_id = v_seller_id
            AND status = 'won'
            AND updated_at BETWEEN v_data_inicio AND v_data_fim
        ) * 100.0 / (
          SELECT COUNT(*)
          FROM crm_deals
          WHERE owner_id = v_seller_id
            AND created_at BETWEEN v_data_inicio AND v_data_fim
        ), 2)
        ELSE 0
      END
    ),
    'origem_leads', (
      SELECT json_agg(origem_data ORDER BY total_vendido DESC)
      FROM (
        SELECT
          COALESCE(ls.name, 'Sem informação') as origem,
          COUNT(d.id) as quantidade,
          COALESCE(SUM(d.value), 0) as total_vendido
        FROM crm_deals d
        LEFT JOIN leads l ON l.id = d.lead_id
        LEFT JOIN lead_sources ls ON ls.id = l.source_id
        WHERE d.owner_id = v_seller_id
          AND d.status = 'won'
          AND d.updated_at BETWEEN v_data_inicio AND v_data_fim
        GROUP BY ls.name
      ) origem_data
    ),
    'produtos_vendidos', (
      SELECT json_agg(produto_data ORDER BY total_vendido DESC)
      FROM (
        SELECT
          COALESCE(d.categoria, 'Sem categoria') as categoria,
          COUNT(d.id) as quantidade,
          COALESCE(SUM(d.value), 0) as total_vendido,
          COALESCE(ROUND(AVG(d.value), 2), 0) as ticket_medio
        FROM crm_deals d
        WHERE d.owner_id = v_seller_id
          AND d.status = 'won'
          AND d.updated_at BETWEEN v_data_inicio AND v_data_fim
        GROUP BY d.categoria
      ) produto_data
    ),
    'arquitetos_vendas', (
      SELECT json_agg(arquiteto_data ORDER BY total_vendido DESC)
      FROM (
        SELECT
          COALESCE(a.name, 'Sem arquiteto') as arquiteto,
          COALESCE(a.id::TEXT, 'sem-arquiteto') as arquiteto_id,
          COUNT(d.id) as quantidade,
          COALESCE(SUM(d.value), 0) as total_vendido
        FROM crm_deals d
        LEFT JOIN architects a ON a.id = d.architect_id
        WHERE d.owner_id = v_seller_id
          AND d.status = 'won'
          AND d.updated_at BETWEEN v_data_inicio AND v_data_fim
        GROUP BY a.name, a.id
      ) arquiteto_data
    ),
    'evolucao_diaria', (
      SELECT json_agg(evolucao_data ORDER BY dia)
      FROM (
        SELECT
          DATE(d.updated_at) as dia,
          COALESCE(SUM(d.value), 0) as valor_acumulado
        FROM crm_deals d
        WHERE d.owner_id = v_seller_id
          AND d.status = 'won'
          AND d.updated_at BETWEEN v_data_inicio AND v_data_fim
        GROUP BY DATE(d.updated_at)
      ) evolucao_data
    ),
    'negocios_ganhos_detalhes', (
      SELECT json_agg(deal_data ORDER BY d.updated_at DESC)
      FROM (
        SELECT
          d.id,
          d.title,
          d.value,
          d.updated_at as data_fechamento,
          COALESCE(ls.name, 'Sem informação') as origem,
          d.product_type as tipo_produto,
          d.categoria,
          d.centro_custo,
          CASE WHEN d.architect_id IS NOT NULL THEN 'Sim' ELSE 'Não' END as possui_arquiteto,
          COALESCE(a.name, 'Sem arquiteto') as nome_arquiteto,
          d.note as observacoes,
          COALESCE(c.name, 'Sem cliente') as cliente
        FROM crm_deals d
        LEFT JOIN leads l ON l.id = d.lead_id
        LEFT JOIN lead_sources ls ON ls.id = l.source_id
        LEFT JOIN architects a ON a.id = d.architect_id
        LEFT JOIN clients c ON c.id = l.client_id
        WHERE d.owner_id = v_seller_id
          AND d.status = 'won'
          AND d.updated_at BETWEEN v_data_inicio AND v_data_fim
      ) deal_data
    ),
    'conversao_por_origem', (
      SELECT json_agg(conversao_data ORDER BY conversao DESC)
      FROM (
        SELECT
          COALESCE(ls.name, 'Sem informação') as origem,
          COUNT(d.id) as leads_total,
          COUNT(d.id) FILTER (WHERE d.status IN ('won', 'lost', 'aberto')) as trabalhados,
          COUNT(d.id) FILTER (WHERE d.status = 'won') as ganhos,
          CASE
            WHEN COUNT(d.id) FILTER (WHERE d.status IN ('won', 'lost')) > 0
            THEN ROUND((COUNT(d.id) FILTER (WHERE d.status = 'won')::NUMERIC * 100.0) / 
                       COUNT(d.id) FILTER (WHERE d.status IN ('won', 'lost')), 2)
            ELSE 0
          END as conversao,
          COALESCE(ROUND(AVG(d.value) FILTER (WHERE d.status = 'won'), 2), 0) as ticket_medio
        FROM crm_deals d
        LEFT JOIN leads l ON l.id = d.lead_id
        LEFT JOIN lead_sources ls ON ls.id = l.source_id
        WHERE d.owner_id = v_seller_id
          AND d.created_at BETWEEN v_data_inicio AND v_data_fim
        GROUP BY ls.name
      ) conversao_data
    ),
    'arquitetos_resumo', json_build_object(
      'total_arquitetos', COALESCE((
        SELECT COUNT(DISTINCT d.architect_id)
        FROM crm_deals d
        WHERE d.owner_id = v_seller_id
          AND d.architect_id IS NOT NULL
          AND d.status = 'won'
          AND d.updated_at BETWEEN v_data_inicio AND v_data_fim
      ), 0),
      'total_vendido_arquitetos', COALESCE((
        SELECT SUM(d.value)
        FROM crm_deals d
        WHERE d.owner_id = v_seller_id
          AND d.architect_id IS NOT NULL
          AND d.status = 'won'
          AND d.updated_at BETWEEN v_data_inicio AND v_data_fim
      ), 0),
      'projetos_efetivados', COALESCE((
        SELECT COUNT(DISTINCT p.id)
        FROM projects p
        INNER JOIN crm_deals d ON d.id = p.deal_id
        WHERE d.owner_id = v_seller_id
          AND p.created_at BETWEEN v_data_inicio AND v_data_fim
      ), 0)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;