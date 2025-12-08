-- Criar função para verificar e expirar metas automaticamente
CREATE OR REPLACE FUNCTION check_and_expire_goals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tendenci_seller_goals
  SET status = 'expirada', updated_at = now()
  WHERE status = 'ativa' 
    AND data_fim < CURRENT_DATE;

  UPDATE tendenci_company_goals
  SET status = 'expirada', updated_at = now()
  WHERE status = 'ativa' 
    AND data_fim < CURRENT_DATE;
END;
$$;

-- Criar função RPC para obter status de metas do período atual
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

  SELECT cg.id, cg.valor_meta, COALESCE(gp.valor_vendido, 0) as valor_vendido, COALESCE(gp.percentual, 0) as percentual
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
    v_company_goal.valor_meta as company_goal_target,
    v_company_goal.valor_vendido as company_goal_current,
    v_company_goal.percentual as company_goal_percentage;
END;
$$;

-- Criar função para verificar vendedores sem meta no mês atual
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
  WHERE p.role IN ('vendedor', 'admin')
    AND NOT EXISTS (
      SELECT 1 FROM tendenci_seller_goals sg
      WHERE sg.vendedor_id = p.id
        AND sg.status = 'ativa'
        AND sg.data_inicio <= now()
        AND sg.data_fim >= now()
    );
END;
$$;

-- Criar função para criar notificações de lembrete de metas
CREATE OR REPLACE FUNCTION create_goal_reminder_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
  v_sellers_count integer;
  v_current_month text;
BEGIN
  SELECT COUNT(*) INTO v_sellers_count
  FROM get_sellers_without_goals();
  
  IF v_sellers_count > 0 THEN
    v_current_month := to_char(now(), 'TMMonth YYYY');
    
    FOR v_admin IN 
      SELECT id FROM profiles WHERE role = 'admin'
    LOOP
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
        v_admin.id,
        'goal_reminder',
        '🎯 Configure as metas de ' || v_current_month,
        v_sellers_count || ' vendedor(es) ainda não possuem metas para este mês.',
        '/metas/gestao',
        jsonb_build_object('sellers_count', v_sellers_count, 'month', v_current_month)
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END;
$$;