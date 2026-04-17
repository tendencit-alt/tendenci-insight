-- Smart Tenant Lifecycle Layer

ALTER TABLE public.customer_health_scores
  ADD COLUMN IF NOT EXISTS activation_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_band text DEFAULT 'baixo',
  ADD COLUMN IF NOT EXISTS maturity_stage text DEFAULT 'setup',
  ADD COLUMN IF NOT EXISTS expansion_ready_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS churn_risk_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS churn_risk_band text DEFAULT 'baixo',
  ADD COLUMN IF NOT EXISTS lifecycle_health_index numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifecycle_updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.tenant_session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid,
  event_type text NOT NULL,
  module text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tse_tenant_date ON public.tenant_session_events (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tse_type ON public.tenant_session_events (event_type);

ALTER TABLE public.tenant_session_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view all session events"
  ON public.tenant_session_events FOR SELECT USING (public.is_owner());

CREATE POLICY "Users insert own tenant session events"
  ON public.tenant_session_events FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "Tenant members view own tenant session events"
  ON public.tenant_session_events FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE TABLE IF NOT EXISTS public.tenant_lifecycle_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  activation_score numeric DEFAULT 0,
  engagement_score numeric DEFAULT 0,
  engagement_band text,
  maturity_stage text,
  expansion_ready_score numeric DEFAULT 0,
  churn_risk_score numeric DEFAULT 0,
  churn_risk_band text,
  lifecycle_health_index numeric DEFAULT 0,
  signals jsonb DEFAULT '{}'::jsonb,
  ai_insight text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_tls_tenant_date ON public.tenant_lifecycle_snapshots (tenant_id, snapshot_date DESC);

ALTER TABLE public.tenant_lifecycle_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view all lifecycle snapshots"
  ON public.tenant_lifecycle_snapshots FOR SELECT USING (public.is_owner());
CREATE POLICY "Owners manage lifecycle snapshots"
  ON public.tenant_lifecycle_snapshots FOR ALL
  USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE OR REPLACE FUNCTION public.calc_tenant_activation_score(_tenant_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  has_chart boolean := false; has_bank boolean := false; has_first_entry boolean := false;
  has_dashboard_view boolean := false; has_report_view boolean := false; score numeric := 0;
BEGIN
  SELECT EXISTS (SELECT 1 FROM fin_chart_of_accounts WHERE tenant_id = _tenant_id LIMIT 1) INTO has_chart;
  SELECT EXISTS (SELECT 1 FROM fin_bank_accounts WHERE tenant_id = _tenant_id LIMIT 1) INTO has_bank;
  SELECT EXISTS (SELECT 1 FROM fin_entries WHERE tenant_id = _tenant_id LIMIT 1) INTO has_first_entry;
  SELECT EXISTS (SELECT 1 FROM tenant_session_events WHERE tenant_id = _tenant_id AND event_type = 'dashboard_view' LIMIT 1) INTO has_dashboard_view;
  SELECT EXISTS (SELECT 1 FROM tenant_session_events WHERE tenant_id = _tenant_id AND event_type = 'report_view' LIMIT 1) INTO has_report_view;
  IF has_chart THEN score := score + 20; END IF;
  IF has_bank THEN score := score + 20; END IF;
  IF has_first_entry THEN score := score + 20; END IF;
  IF has_dashboard_view THEN score := score + 20; END IF;
  IF has_report_view THEN score := score + 20; END IF;
  RETURN score;
END;
$$;

CREATE OR REPLACE FUNCTION public.calc_tenant_engagement_score(_tenant_id uuid)
RETURNS TABLE (score numeric, band text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  logins int; reports int; entries int; days_active int; s numeric := 0; b text := 'baixo';
BEGIN
  SELECT count(*) INTO logins FROM tenant_session_events
   WHERE tenant_id = _tenant_id AND event_type = 'login' AND created_at > now() - interval '30 days';
  SELECT count(*) INTO reports FROM tenant_session_events
   WHERE tenant_id = _tenant_id AND event_type IN ('report_view','dashboard_view') AND created_at > now() - interval '30 days';
  SELECT count(*) INTO entries FROM fin_entries
   WHERE tenant_id = _tenant_id AND created_at > now() - interval '30 days';
  SELECT count(DISTINCT date(created_at)) INTO days_active FROM tenant_session_events
   WHERE tenant_id = _tenant_id AND created_at > now() - interval '30 days';
  s := LEAST(25, logins::numeric * 1.5)
     + LEAST(25, reports::numeric * 1.0)
     + LEAST(25, entries::numeric * 0.5)
     + LEAST(25, days_active::numeric * 1.0);
  b := CASE WHEN s >= 80 THEN 'power_user' WHEN s >= 55 THEN 'saudavel' WHEN s >= 25 THEN 'moderado' ELSE 'baixo' END;
  RETURN QUERY SELECT s, b;
END;
$$;

CREATE OR REPLACE FUNCTION public.calc_tenant_maturity_stage(_tenant_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE entries int; cost_centers int; reports int; users_n int; budgets int;
BEGIN
  SELECT count(*) INTO entries FROM fin_entries WHERE tenant_id = _tenant_id;
  SELECT count(*) INTO cost_centers FROM fin_cost_centers WHERE tenant_id = _tenant_id;
  SELECT count(*) INTO reports FROM tenant_session_events
    WHERE tenant_id = _tenant_id AND event_type = 'report_view' AND created_at > now() - interval '60 days';
  SELECT count(*) INTO users_n FROM profiles WHERE tenant_id = _tenant_id;
  SELECT count(*) INTO budgets FROM project_budgets WHERE tenant_id = _tenant_id;
  IF entries < 5 THEN RETURN 'setup'; END IF;
  IF reports < 5 AND budgets = 0 THEN RETURN 'operacional'; END IF;
  IF reports < 30 AND cost_centers >= 3 THEN RETURN 'gestao_ativa'; END IF;
  IF reports >= 30 AND budgets > 0 AND users_n >= 3 THEN
    IF users_n >= 8 AND reports >= 100 THEN RETURN 'data_driven'; END IF;
    RETURN 'gestao_estrategica';
  END IF;
  RETURN 'operacional';
END;
$$;

CREATE OR REPLACE FUNCTION public.calc_tenant_expansion_score(_tenant_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  users_pct numeric := 0; bi_use int := 0; cc_n int := 0; reports_30d int := 0; s numeric := 0;
  user_limit int; user_count int;
BEGIN
  SELECT (limit_value)::int INTO user_limit FROM plan_limits pl
   JOIN tenant_plans tp ON tp.plan_id = pl.plan_id
   WHERE tp.tenant_id = _tenant_id AND pl.limit_key = 'max_users' LIMIT 1;
  SELECT count(*) INTO user_count FROM profiles WHERE tenant_id = _tenant_id;
  IF user_limit IS NOT NULL AND user_limit > 0 THEN
    users_pct := (user_count::numeric / user_limit::numeric) * 100;
  END IF;
  SELECT count(*) INTO bi_use FROM tenant_session_events
   WHERE tenant_id = _tenant_id AND event_type IN ('report_view','dashboard_view')
     AND created_at > now() - interval '30 days';
  SELECT count(*) INTO cc_n FROM fin_cost_centers WHERE tenant_id = _tenant_id;
  SELECT count(*) INTO reports_30d FROM tenant_session_events
   WHERE tenant_id = _tenant_id AND event_type = 'report_view'
     AND created_at > now() - interval '30 days';
  s := LEAST(30, users_pct * 0.3)
     + LEAST(25, bi_use::numeric * 0.4)
     + LEAST(20, cc_n::numeric * 2.0)
     + LEAST(25, reports_30d::numeric * 0.5);
  RETURN LEAST(100, s);
END;
$$;

CREATE OR REPLACE FUNCTION public.calc_tenant_churn_risk(_tenant_id uuid)
RETURNS TABLE (score numeric, band text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  logins_30 int; logins_60_30 int; entries_30 int; entries_60_30 int;
  reports_30 int; reports_60_30 int; is_overdue boolean := false; onboarding_done boolean := true;
  s numeric := 0; b text := 'baixo';
BEGIN
  SELECT count(*) INTO logins_30 FROM tenant_session_events WHERE tenant_id = _tenant_id AND event_type='login' AND created_at > now() - interval '30 days';
  SELECT count(*) INTO logins_60_30 FROM tenant_session_events WHERE tenant_id = _tenant_id AND event_type='login' AND created_at BETWEEN now() - interval '60 days' AND now() - interval '30 days';
  SELECT count(*) INTO entries_30 FROM fin_entries WHERE tenant_id = _tenant_id AND created_at > now() - interval '30 days';
  SELECT count(*) INTO entries_60_30 FROM fin_entries WHERE tenant_id = _tenant_id AND created_at BETWEEN now() - interval '60 days' AND now() - interval '30 days';
  SELECT count(*) INTO reports_30 FROM tenant_session_events WHERE tenant_id = _tenant_id AND event_type='report_view' AND created_at > now() - interval '30 days';
  SELECT count(*) INTO reports_60_30 FROM tenant_session_events WHERE tenant_id = _tenant_id AND event_type='report_view' AND created_at BETWEEN now() - interval '60 days' AND now() - interval '30 days';
  SELECT EXISTS (SELECT 1 FROM billing_dunning_steps WHERE tenant_id = _tenant_id AND status IN ('pending','executed') AND triggered_at > now() - interval '60 days') INTO is_overdue;
  SELECT (calc_tenant_activation_score(_tenant_id) >= 60) INTO onboarding_done;
  IF logins_60_30 > 0 AND logins_30 < logins_60_30 * 0.5 THEN s := s + 25; END IF;
  IF entries_60_30 > 0 AND entries_30 < entries_60_30 * 0.5 THEN s := s + 20; END IF;
  IF reports_60_30 > 0 AND reports_30 < reports_60_30 * 0.5 THEN s := s + 15; END IF;
  IF is_overdue THEN s := s + 25; END IF;
  IF NOT onboarding_done THEN s := s + 15; END IF;
  s := LEAST(100, s);
  b := CASE WHEN s >= 65 THEN 'alto' WHEN s >= 35 THEN 'moderado' ELSE 'baixo' END;
  RETURN QUERY SELECT s, b;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_tenant_lifecycle(_tenant_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  act numeric; eng_score numeric; eng_band text; mat text; exp_s numeric;
  churn_s numeric; churn_b text; health numeric; billing_ok boolean := true;
BEGIN
  act := calc_tenant_activation_score(_tenant_id);
  SELECT score, band INTO eng_score, eng_band FROM calc_tenant_engagement_score(_tenant_id);
  mat := calc_tenant_maturity_stage(_tenant_id);
  exp_s := calc_tenant_expansion_score(_tenant_id);
  SELECT score, band INTO churn_s, churn_b FROM calc_tenant_churn_risk(_tenant_id);
  SELECT NOT EXISTS (SELECT 1 FROM subscriptions WHERE tenant_id = _tenant_id AND status IN ('suspended','cancelled')) INTO billing_ok;
  health := (act * 0.25) + (eng_score * 0.30) + (CASE WHEN billing_ok THEN 25 ELSE 0 END) + ((100 - churn_s) * 0.20);
  health := LEAST(100, GREATEST(0, health));

  INSERT INTO customer_health_scores (
    tenant_id, activation_score, engagement_score, engagement_band,
    maturity_stage, expansion_ready_score, churn_risk_score, churn_risk_band,
    lifecycle_health_index, lifecycle_updated_at
  ) VALUES (_tenant_id, act, eng_score, eng_band, mat, exp_s, churn_s, churn_b, health, now())
  ON CONFLICT (tenant_id) DO UPDATE SET
    activation_score = EXCLUDED.activation_score,
    engagement_score = EXCLUDED.engagement_score,
    engagement_band = EXCLUDED.engagement_band,
    maturity_stage = EXCLUDED.maturity_stage,
    expansion_ready_score = EXCLUDED.expansion_ready_score,
    churn_risk_score = EXCLUDED.churn_risk_score,
    churn_risk_band = EXCLUDED.churn_risk_band,
    lifecycle_health_index = EXCLUDED.lifecycle_health_index,
    lifecycle_updated_at = now();

  INSERT INTO tenant_lifecycle_snapshots (
    tenant_id, snapshot_date, activation_score, engagement_score, engagement_band,
    maturity_stage, expansion_ready_score, churn_risk_score, churn_risk_band, lifecycle_health_index, signals
  ) VALUES (_tenant_id, CURRENT_DATE, act, eng_score, eng_band, mat, exp_s, churn_s, churn_b, health,
    jsonb_build_object('billing_ok', billing_ok))
  ON CONFLICT (tenant_id, snapshot_date) DO UPDATE SET
    activation_score = EXCLUDED.activation_score,
    engagement_score = EXCLUDED.engagement_score,
    engagement_band = EXCLUDED.engagement_band,
    maturity_stage = EXCLUDED.maturity_stage,
    expansion_ready_score = EXCLUDED.expansion_ready_score,
    churn_risk_score = EXCLUDED.churn_risk_score,
    churn_risk_band = EXCLUDED.churn_risk_band,
    lifecycle_health_index = EXCLUDED.lifecycle_health_index,
    signals = EXCLUDED.signals;

  RETURN jsonb_build_object('tenant_id', _tenant_id, 'activation', act, 'engagement', eng_score,
    'engagement_band', eng_band, 'maturity', mat, 'expansion', exp_s,
    'churn_risk', churn_s, 'churn_band', churn_b, 'health', health);
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_all_tenants_lifecycle()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT id FROM tenants WHERE active = true LOOP
    PERFORM compute_tenant_lifecycle(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_lifecycle_overview()
RETURNS TABLE (
  tenant_id uuid, tenant_name text, activation_score numeric, engagement_score numeric,
  engagement_band text, maturity_stage text, expansion_ready_score numeric,
  churn_risk_score numeric, churn_risk_band text, lifecycle_health_index numeric,
  updated_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.name,
         COALESCE(c.activation_score, 0), COALESCE(c.engagement_score, 0),
         COALESCE(c.engagement_band, 'baixo'), COALESCE(c.maturity_stage, 'setup'),
         COALESCE(c.expansion_ready_score, 0), COALESCE(c.churn_risk_score, 0),
         COALESCE(c.churn_risk_band, 'baixo'), COALESCE(c.lifecycle_health_index, 0),
         c.lifecycle_updated_at
    FROM tenants t
    LEFT JOIN customer_health_scores c ON c.tenant_id = t.id
   WHERE t.active = true
   ORDER BY COALESCE(c.churn_risk_score, 0) DESC, COALESCE(c.lifecycle_health_index, 0) ASC;
$$;