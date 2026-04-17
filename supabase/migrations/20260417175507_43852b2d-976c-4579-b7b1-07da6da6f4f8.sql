-- ============================================================================
-- SMART CONTROL TOWER OWNER - Infrastructure
-- ============================================================================

-- 1. system_health_snapshots: histórico de saúde do sistema
CREATE TABLE IF NOT EXISTS public.system_health_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  window_hours INTEGER NOT NULL DEFAULT 24,
  errors_24h INTEGER NOT NULL DEFAULT 0,
  failed_automations_24h INTEGER NOT NULL DEFAULT 0,
  edge_function_failures_24h INTEGER NOT NULL DEFAULT 0,
  delayed_jobs INTEGER NOT NULL DEFAULT 0,
  integration_failures_24h INTEGER NOT NULL DEFAULT 0,
  avg_query_latency_ms NUMERIC,
  critical_alerts INTEGER NOT NULL DEFAULT 0,
  overall_health_score INTEGER NOT NULL DEFAULT 100,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_health_snapshot_at ON public.system_health_snapshots(snapshot_at DESC);

ALTER TABLE public.system_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view system health snapshots"
  ON public.system_health_snapshots FOR SELECT
  USING (public.is_owner());

CREATE POLICY "Service role manages system health snapshots"
  ON public.system_health_snapshots FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. owner_control_tower_kpis: snapshot diário de KPIs executivos
CREATE TABLE IF NOT EXISTS public.owner_control_tower_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active_tenants INTEGER NOT NULL DEFAULT 0,
  total_tenants INTEGER NOT NULL DEFAULT 0,
  trial_tenants INTEGER NOT NULL DEFAULT 0,
  paying_tenants INTEGER NOT NULL DEFAULT 0,
  mrr_cents BIGINT NOT NULL DEFAULT 0,
  arr_cents BIGINT NOT NULL DEFAULT 0,
  delinquent_tenants INTEGER NOT NULL DEFAULT 0,
  delinquency_rate NUMERIC NOT NULL DEFAULT 0,
  churn_rate_30d NUMERIC NOT NULL DEFAULT 0,
  avg_activation_score NUMERIC NOT NULL DEFAULT 0,
  avg_engagement_score NUMERIC NOT NULL DEFAULT 0,
  avg_health_index NUMERIC NOT NULL DEFAULT 0,
  avg_churn_risk NUMERIC NOT NULL DEFAULT 0,
  avg_expansion_ready NUMERIC NOT NULL DEFAULT 0,
  high_churn_risk_count INTEGER NOT NULL DEFAULT 0,
  expansion_ready_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_owner_kpis_date ON public.owner_control_tower_kpis(snapshot_date DESC);

ALTER TABLE public.owner_control_tower_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view control tower KPIs"
  ON public.owner_control_tower_kpis FOR SELECT
  USING (public.is_owner());

CREATE POLICY "Service role manages control tower KPIs"
  ON public.owner_control_tower_kpis FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- 3. calc_system_health_snapshot
CREATE OR REPLACE FUNCTION public.calc_system_health_snapshot()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_errors INTEGER := 0;
  v_failed_autom INTEGER := 0;
  v_edge_fails INTEGER := 0;
  v_delayed INTEGER := 0;
  v_integ_fails INTEGER := 0;
  v_critical INTEGER := 0;
  v_health INTEGER := 100;
  v_id UUID;
BEGIN
  -- Erros de automação últimas 24h
  SELECT COUNT(*) INTO v_failed_autom
  FROM public.automation_execution_logs
  WHERE created_at > now() - INTERVAL '24 hours'
    AND status IN ('error', 'failed');

  -- Eventos críticos (audit_log com event_type contendo erro)
  SELECT COUNT(*) INTO v_errors
  FROM public.audit_log
  WHERE created_at > now() - INTERVAL '24 hours'
    AND (event_type ILIKE '%error%' OR event_type ILIKE '%fail%');

  -- Alertas críticos abertos
  SELECT COUNT(*) INTO v_critical
  FROM public.ai_strategy_alerts
  WHERE acknowledged = false
    AND severity IN ('high', 'critical');

  -- Health score: 100 - penalidades
  v_health := GREATEST(0, 100
    - LEAST(40, v_failed_autom * 2)
    - LEAST(20, v_errors)
    - LEAST(20, v_critical * 5)
  );

  INSERT INTO public.system_health_snapshots (
    errors_24h, failed_automations_24h, edge_function_failures_24h,
    delayed_jobs, integration_failures_24h, critical_alerts, overall_health_score
  ) VALUES (
    v_errors, v_failed_autom, v_edge_fails,
    v_delayed, v_integ_fails, v_critical, v_health
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 4. calc_owner_control_tower_kpis
CREATE OR REPLACE FUNCTION public.calc_owner_control_tower_kpis()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER := 0;
  v_active INTEGER := 0;
  v_trial INTEGER := 0;
  v_paying INTEGER := 0;
  v_mrr BIGINT := 0;
  v_arr BIGINT := 0;
  v_delinq INTEGER := 0;
  v_delinq_rate NUMERIC := 0;
  v_avg_act NUMERIC := 0;
  v_avg_eng NUMERIC := 0;
  v_avg_health NUMERIC := 0;
  v_avg_churn NUMERIC := 0;
  v_avg_exp NUMERIC := 0;
  v_high_churn INTEGER := 0;
  v_exp_ready INTEGER := 0;
  v_id UUID;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.tenants;

  SELECT COUNT(*) INTO v_active
  FROM public.tenants WHERE status = 'active' OR status IS NULL;

  SELECT
    COALESCE(SUM(CASE WHEN status = 'trialing' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'active' THEN COALESCE(amount_cents, 0) ELSE 0 END), 0)
  INTO v_trial, v_paying, v_mrr
  FROM public.subscriptions;

  v_arr := v_mrr * 12;

  SELECT COUNT(DISTINCT tenant_id) INTO v_delinq
  FROM public.invoices
  WHERE status IN ('overdue', 'unpaid')
    AND due_date < CURRENT_DATE;

  IF v_total > 0 THEN
    v_delinq_rate := (v_delinq::NUMERIC / v_total::NUMERIC) * 100;
  END IF;

  SELECT
    COALESCE(AVG(activation_score), 0),
    COALESCE(AVG(engagement_score), 0),
    COALESCE(AVG(lifecycle_health_index), 0),
    COALESCE(AVG(churn_risk_score), 0),
    COALESCE(AVG(expansion_ready_score), 0),
    COALESCE(SUM(CASE WHEN churn_risk_band = 'high' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN expansion_ready_score >= 70 THEN 1 ELSE 0 END), 0)
  INTO v_avg_act, v_avg_eng, v_avg_health, v_avg_churn, v_avg_exp, v_high_churn, v_exp_ready
  FROM public.customer_health_scores;

  INSERT INTO public.owner_control_tower_kpis (
    snapshot_date, active_tenants, total_tenants, trial_tenants, paying_tenants,
    mrr_cents, arr_cents, delinquent_tenants, delinquency_rate,
    avg_activation_score, avg_engagement_score, avg_health_index,
    avg_churn_risk, avg_expansion_ready, high_churn_risk_count, expansion_ready_count
  ) VALUES (
    CURRENT_DATE, v_active, v_total, v_trial, v_paying,
    v_mrr, v_arr, v_delinq, v_delinq_rate,
    v_avg_act, v_avg_eng, v_avg_health, v_avg_churn, v_avg_exp, v_high_churn, v_exp_ready
  )
  ON CONFLICT (snapshot_date) DO UPDATE SET
    active_tenants = EXCLUDED.active_tenants,
    total_tenants = EXCLUDED.total_tenants,
    trial_tenants = EXCLUDED.trial_tenants,
    paying_tenants = EXCLUDED.paying_tenants,
    mrr_cents = EXCLUDED.mrr_cents,
    arr_cents = EXCLUDED.arr_cents,
    delinquent_tenants = EXCLUDED.delinquent_tenants,
    delinquency_rate = EXCLUDED.delinquency_rate,
    avg_activation_score = EXCLUDED.avg_activation_score,
    avg_engagement_score = EXCLUDED.avg_engagement_score,
    avg_health_index = EXCLUDED.avg_health_index,
    avg_churn_risk = EXCLUDED.avg_churn_risk,
    avg_expansion_ready = EXCLUDED.avg_expansion_ready,
    high_churn_risk_count = EXCLUDED.high_churn_risk_count,
    expansion_ready_count = EXCLUDED.expansion_ready_count
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 5. get_owner_activation_monitor
CREATE OR REPLACE FUNCTION public.get_owner_activation_monitor()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Access denied: owner role required';
  END IF;

  SELECT jsonb_build_object(
    'activated', (SELECT COUNT(*) FROM public.customer_health_scores WHERE activation_score >= 70),
    'incomplete_onboarding', (SELECT COUNT(*) FROM public.customer_health_scores WHERE activation_score < 70),
    'avg_activation_score', (SELECT COALESCE(AVG(activation_score), 0)::INT FROM public.customer_health_scores),
    'avg_days_to_activate', (
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (chs.last_calculated_at - t.created_at)) / 86400), 0)::INT
      FROM public.customer_health_scores chs
      JOIN public.tenants t ON t.id = chs.tenant_id
      WHERE chs.activation_score >= 70
    ),
    'top_dropoff_steps', '[]'::jsonb
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 6. get_owner_lifecycle_heatmap
CREATE OR REPLACE FUNCTION public.get_owner_lifecycle_heatmap()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Access denied: owner role required';
  END IF;

  SELECT jsonb_build_object(
    'setup', COUNT(*) FILTER (WHERE maturity_stage = 'setup'),
    'operational', COUNT(*) FILTER (WHERE maturity_stage = 'operational'),
    'active_management', COUNT(*) FILTER (WHERE maturity_stage = 'active_management'),
    'strategic_management', COUNT(*) FILTER (WHERE maturity_stage = 'strategic_management'),
    'data_driven', COUNT(*) FILTER (WHERE maturity_stage = 'data_driven'),
    'unclassified', COUNT(*) FILTER (WHERE maturity_stage IS NULL)
  ) INTO v_result
  FROM public.customer_health_scores;

  RETURN v_result;
END;
$$;

-- 7. get_owner_billing_radar
CREATE OR REPLACE FUNCTION public.get_owner_billing_radar()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_mrr BIGINT := 0;
  v_total INTEGER := 0;
  v_delinq INTEGER := 0;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Access denied: owner role required';
  END IF;

  SELECT COALESCE(SUM(amount_cents), 0) INTO v_mrr
  FROM public.subscriptions WHERE status = 'active';

  SELECT COUNT(*) INTO v_total FROM public.tenants;

  SELECT COUNT(DISTINCT tenant_id) INTO v_delinq
  FROM public.invoices
  WHERE status IN ('overdue', 'unpaid') AND due_date < CURRENT_DATE;

  SELECT jsonb_build_object(
    'mrr_cents', v_mrr,
    'arr_cents', v_mrr * 12,
    'delinquency_rate', CASE WHEN v_total > 0 THEN (v_delinq::NUMERIC / v_total::NUMERIC) * 100 ELSE 0 END,
    'delinquent_tenants', v_delinq,
    'revenue_by_plan', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('plan', plan_id, 'mrr_cents', total, 'count', cnt)), '[]'::jsonb)
      FROM (
        SELECT plan_id, SUM(amount_cents) AS total, COUNT(*) AS cnt
        FROM public.subscriptions
        WHERE status = 'active'
        GROUP BY plan_id
      ) sub
    ),
    'recent_cancellations', (
      SELECT COUNT(*) FROM public.subscriptions
      WHERE status = 'canceled' AND updated_at > now() - INTERVAL '30 days'
    ),
    'upgrade_count_30d', (
      SELECT COUNT(*) FROM public.subscription_changes
      WHERE change_type = 'upgrade' AND created_at > now() - INTERVAL '30 days'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 8. get_owner_churn_radar
CREATE OR REPLACE FUNCTION public.get_owner_churn_radar()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Access denied: owner role required';
  END IF;

  SELECT jsonb_build_object(
    'high_risk_count', COUNT(*) FILTER (WHERE churn_risk_band = 'high'),
    'moderate_risk_count', COUNT(*) FILTER (WHERE churn_risk_band = 'moderate'),
    'low_risk_count', COUNT(*) FILTER (WHERE churn_risk_band = 'low'),
    'avg_churn_risk', COALESCE(AVG(churn_risk_score), 0)::INT,
    'high_risk_tenants', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'tenant_id', chs.tenant_id,
        'tenant_name', t.name,
        'churn_risk_score', chs.churn_risk_score,
        'engagement_band', chs.engagement_band,
        'lifecycle_health_index', chs.lifecycle_health_index
      ) ORDER BY chs.churn_risk_score DESC), '[]'::jsonb)
      FROM public.customer_health_scores chs
      LEFT JOIN public.tenants t ON t.id = chs.tenant_id
      WHERE chs.churn_risk_band = 'high'
      LIMIT 20
    )
  ) INTO v_result
  FROM public.customer_health_scores;

  RETURN v_result;
END;
$$;

-- 9. get_owner_expansion_signals
CREATE OR REPLACE FUNCTION public.get_owner_expansion_signals()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Access denied: owner role required';
  END IF;

  SELECT jsonb_build_object(
    'ready_count', COUNT(*) FILTER (WHERE expansion_ready_score >= 70),
    'avg_expansion_score', COALESCE(AVG(expansion_ready_score), 0)::INT,
    'ready_tenants', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'tenant_id', chs.tenant_id,
        'tenant_name', t.name,
        'expansion_ready_score', chs.expansion_ready_score,
        'engagement_band', chs.engagement_band,
        'maturity_stage', chs.maturity_stage
      ) ORDER BY chs.expansion_ready_score DESC), '[]'::jsonb)
      FROM public.customer_health_scores chs
      LEFT JOIN public.tenants t ON t.id = chs.tenant_id
      WHERE chs.expansion_ready_score >= 70
      LIMIT 20
    )
  ) INTO v_result
  FROM public.customer_health_scores;

  RETURN v_result;
END;
$$;

-- 10. get_owner_system_health_realtime
CREATE OR REPLACE FUNCTION public.get_owner_system_health_realtime()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_failed_autom INTEGER;
  v_critical INTEGER;
  v_errors INTEGER;
  v_health INTEGER;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'Access denied: owner role required';
  END IF;

  SELECT COUNT(*) INTO v_failed_autom
  FROM public.automation_execution_logs
  WHERE created_at > now() - INTERVAL '24 hours' AND status IN ('error', 'failed');

  SELECT COUNT(*) INTO v_errors
  FROM public.audit_log
  WHERE created_at > now() - INTERVAL '24 hours'
    AND (event_type ILIKE '%error%' OR event_type ILIKE '%fail%');

  SELECT COUNT(*) INTO v_critical
  FROM public.ai_strategy_alerts
  WHERE acknowledged = false AND severity IN ('high', 'critical');

  v_health := GREATEST(0, 100 - LEAST(40, v_failed_autom * 2) - LEAST(20, v_errors) - LEAST(20, v_critical * 5));

  SELECT jsonb_build_object(
    'overall_health_score', v_health,
    'errors_24h', v_errors,
    'failed_automations_24h', v_failed_autom,
    'critical_alerts', v_critical,
    'recent_snapshots', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'snapshot_at', snapshot_at,
        'overall_health_score', overall_health_score,
        'errors_24h', errors_24h,
        'failed_automations_24h', failed_automations_24h
      ) ORDER BY snapshot_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM public.system_health_snapshots ORDER BY snapshot_at DESC LIMIT 24) s
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;