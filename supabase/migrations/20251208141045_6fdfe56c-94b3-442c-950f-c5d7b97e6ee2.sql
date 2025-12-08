-- Corrigir função get_current_goals_status (usar valor_meta_total para company goals)
CREATE OR REPLACE FUNCTION get_current_goals_status(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  has_active_seller_goal boolean,
  has_active_company_goal boolean,
  current_month text,
  seller_goal_id uuid,
  seller_goal_target numeric,
  seller_goal_current numeric,
  seller_goal_percentage numeric,
  company_goal_id uuid,
  company_goal_target numeric,
  company_goal_current numeric,
  company_goal_percentage numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_goal RECORD;
  v_company_goal RECORD;
  v_now timestamp with time zone := now();
BEGIN
  -- Meta do vendedor
  SELECT sg.id, sg.valor_meta, COALESCE(gp.valor_vendido, 0) as valor_vendido, COALESCE(gp.percentual, 0) as percentual
  INTO v_seller_goal
  FROM tendenci_seller_goals sg
  LEFT JOIN tendenci_goal_progress gp ON gp.seller_goal_id = sg.id
  WHERE sg.vendedor_id = COALESCE(p_user_id, auth.uid())
    AND sg.status = 'ativa'
    AND sg.data_inicio <= v_now
    AND sg.data_fim >= v_now
  ORDER BY sg.created_at DESC
  LIMIT 1;

  -- Meta da empresa (CORRIGIDO: usar valor_meta_total)
  SELECT cg.id, cg.valor_meta_total, COALESCE(gp.valor_vendido, 0) as valor_vendido, COALESCE(gp.percentual, 0) as percentual
  INTO v_company_goal
  FROM tendenci_company_goals cg
  LEFT JOIN tendenci_goal_progress gp ON gp.company_goal_id = cg.id
  WHERE cg.status = 'ativa'
    AND cg.data_inicio <= v_now
    AND cg.data_fim >= v_now
  ORDER BY cg.created_at DESC
  LIMIT 1;

  RETURN QUERY SELECT 
    v_seller_goal.id IS NOT NULL as has_active_seller_goal,
    v_company_goal.id IS NOT NULL as has_active_company_goal,
    to_char(v_now, 'YYYY-MM') as current_month,
    v_seller_goal.id as seller_goal_id,
    v_seller_goal.valor_meta as seller_goal_target,
    v_seller_goal.valor_vendido as seller_goal_current,
    v_seller_goal.percentual as seller_goal_percentage,
    v_company_goal.id as company_goal_id,
    v_company_goal.valor_meta_total as company_goal_target,
    v_company_goal.valor_vendido as company_goal_current,
    v_company_goal.percentual as company_goal_percentage;
END;
$$;

-- Corrigir função get_sellers_without_goals (apenas vendedores, não admins)
CREATE OR REPLACE FUNCTION get_sellers_without_goals()
RETURNS TABLE(
  seller_id uuid,
  seller_name text,
  seller_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.full_name, p.email
  FROM profiles p
  WHERE p.role = 'vendedor'
    AND NOT EXISTS (
      SELECT 1 FROM tendenci_seller_goals sg
      WHERE sg.vendedor_id = p.id
        AND sg.status = 'ativa'
        AND sg.data_inicio <= now()
        AND sg.data_fim >= now()
    );
END;
$$;