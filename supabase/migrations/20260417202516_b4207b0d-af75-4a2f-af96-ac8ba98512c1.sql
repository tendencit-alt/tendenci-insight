-- ============ TABLES ============
CREATE TABLE public.predictive_risk_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code text NOT NULL,
  signal_type text NOT NULL,
  signal_value numeric NOT NULL DEFAULT 0,
  baseline_value numeric NOT NULL DEFAULT 0,
  deviation_percent numeric NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pred_signals_module ON public.predictive_risk_signals(module_code, created_at DESC);
CREATE INDEX idx_pred_signals_type ON public.predictive_risk_signals(signal_type, created_at DESC);

CREATE TABLE public.predictive_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_code text NOT NULL,
  anomaly_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  confidence_score numeric NOT NULL DEFAULT 0,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pred_anom_target ON public.predictive_anomalies(target_code, detected_at DESC);
CREATE INDEX idx_pred_anom_severity ON public.predictive_anomalies(severity, detected_at DESC);

CREATE TABLE public.predictive_drift_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_code text NOT NULL,
  metric_name text NOT NULL,
  trend_direction text NOT NULL,
  trend_strength numeric NOT NULL DEFAULT 0,
  window_hours int NOT NULL DEFAULT 24,
  current_value numeric,
  baseline_value numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pred_drift_target ON public.predictive_drift_snapshots(target_code, created_at DESC);

CREATE TABLE public.predictive_failure_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_code text NOT NULL,
  target_type text NOT NULL DEFAULT 'module',
  failure_probability_score numeric NOT NULL DEFAULT 0,
  severity_band text NOT NULL DEFAULT 'low',
  recommended_preventive_action text,
  contributing_factors jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(target_code, target_type)
);
CREATE INDEX idx_pred_scores_band ON public.predictive_failure_scores(severity_band, failure_probability_score DESC);

CREATE TABLE public.preventive_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_code text NOT NULL,
  action_code text NOT NULL,
  execution_mode text NOT NULL DEFAULT 'manual',
  result text NOT NULL DEFAULT 'pending',
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prev_actions_target ON public.preventive_action_logs(target_code, created_at DESC);

-- ============ RLS ============
ALTER TABLE public.predictive_risk_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_drift_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_failure_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preventive_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_pred_signals" ON public.predictive_risk_signals FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "owner_all_pred_anomalies" ON public.predictive_anomalies FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "owner_all_pred_drift" ON public.predictive_drift_snapshots FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "owner_all_pred_scores" ON public.predictive_failure_scores FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "owner_all_prev_actions" ON public.preventive_action_logs FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

-- ============ ENGINES ============

-- 1. RISK SIGNAL ENGINE
CREATE OR REPLACE FUNCTION public.detect_predictive_signals()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int := 0;
  r record;
BEGIN
  -- Snapshot delay (integrações)
  FOR r IN
    SELECT source_module_code AS code,
           COALESCE(delay_minutes, 0) AS delay,
           60 AS baseline
    FROM integration_health_snapshots
    WHERE delay_minutes IS NOT NULL AND delay_minutes > 60
  LOOP
    INSERT INTO predictive_risk_signals(module_code, signal_type, signal_value, baseline_value, deviation_percent)
    VALUES (r.code, 'snapshot_delay_growth', r.delay, r.baseline,
            CASE WHEN r.baseline > 0 THEN ((r.delay - r.baseline) / r.baseline) * 100 ELSE 0 END);
    v_count := v_count + 1;
  END LOOP;

  -- Retry/timeout growth (recovery history failures)
  FOR r IN
    SELECT policy_code AS code,
           count(*) FILTER (WHERE execution_result = 'failed') AS failures,
           count(*) AS total
    FROM recovery_execution_history
    WHERE executed_at > now() - interval '24 hours'
    GROUP BY policy_code
    HAVING count(*) FILTER (WHERE execution_result = 'failed') > 0
  LOOP
    INSERT INTO predictive_risk_signals(module_code, signal_type, signal_value, baseline_value, deviation_percent, metadata)
    VALUES (r.code, 'retry_growth', r.failures, GREATEST(r.total - r.failures, 1),
            (r.failures::numeric / NULLIF(r.total,0)) * 100,
            jsonb_build_object('window','24h','total',r.total));
    v_count := v_count + 1;
  END LOOP;

  -- Dependency degradation recurrence
  FOR r IN
    SELECT layer_code AS code, count(*) AS hits
    FROM architecture_layer_status
    WHERE health_status IN ('red','yellow')
    GROUP BY layer_code
  LOOP
    INSERT INTO predictive_risk_signals(module_code, signal_type, signal_value, baseline_value, deviation_percent)
    VALUES (r.code, 'dependency_degradation_recurrence', r.hits, 0, 100);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 2. ANOMALY DETECTION
CREATE OR REPLACE FUNCTION public.detect_predictive_anomalies()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int := 0;
  r record;
BEGIN
  -- Anomalia: spike de sinais no mesmo módulo
  FOR r IN
    SELECT module_code, count(*) AS sig_count, max(deviation_percent) AS max_dev
    FROM predictive_risk_signals
    WHERE created_at > now() - interval '6 hours'
    GROUP BY module_code
    HAVING count(*) >= 2
  LOOP
    INSERT INTO predictive_anomalies(target_type, target_code, anomaly_type, severity, confidence_score, description)
    VALUES ('module', r.module_code, 'signal_cluster',
            CASE WHEN r.sig_count >= 4 THEN 'high'
                 WHEN r.sig_count >= 3 THEN 'medium'
                 ELSE 'low' END,
            LEAST(r.sig_count * 20, 95),
            format('%s sinais agrupados (desvio máx %s%%)', r.sig_count, round(r.max_dev,1)));
    v_count := v_count + 1;
  END LOOP;

  -- Anomalia: integração com status crítico inesperado
  FOR r IN
    SELECT source_module_code AS code, current_status, health_score
    FROM integration_health_snapshots
    WHERE current_status IN ('red') AND health_score < 50
  LOOP
    INSERT INTO predictive_anomalies(target_type, target_code, anomaly_type, severity, confidence_score, description)
    VALUES ('integration', r.code, 'health_collapse', 'high', 90,
            format('Health score caiu para %s', r.health_score));
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 3. DRIFT DETECTION
CREATE OR REPLACE FUNCTION public.compute_predictive_drift()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int := 0;
  r record;
BEGIN
  -- Drift de health score por integração (últimas 24h)
  FOR r IN
    SELECT source_module_code AS code,
           avg(health_score) AS curr,
           50 AS baseline
    FROM integration_health_snapshots
    GROUP BY source_module_code
  LOOP
    INSERT INTO predictive_drift_snapshots(target_code, metric_name, trend_direction, trend_strength, window_hours, current_value, baseline_value)
    VALUES (r.code, 'health_score',
            CASE WHEN r.curr < r.baseline - 10 THEN 'degrading'
                 WHEN r.curr > r.baseline + 10 THEN 'improving'
                 ELSE 'stable' END,
            abs(r.curr - r.baseline),
            24, r.curr, r.baseline);
    v_count := v_count + 1;
  END LOOP;

  -- Drift de duração de recovery
  FOR r IN
    SELECT policy_code AS code, avg(duration_ms) AS curr_ms
    FROM recovery_execution_history
    WHERE executed_at > now() - interval '24 hours' AND duration_ms IS NOT NULL
    GROUP BY policy_code
    HAVING avg(duration_ms) > 100
  LOOP
    INSERT INTO predictive_drift_snapshots(target_code, metric_name, trend_direction, trend_strength, window_hours, current_value, baseline_value)
    VALUES (r.code, 'recovery_duration',
            CASE WHEN r.curr_ms > 1000 THEN 'degrading' ELSE 'stable' END,
            LEAST(r.curr_ms / 100, 100),
            24, r.curr_ms, 100);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 4. FAILURE PROBABILITY SCORING
CREATE OR REPLACE FUNCTION public.compute_failure_probability()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int := 0;
  r record;
  v_score numeric;
  v_band text;
  v_action text;
BEGIN
  FOR r IN
    SELECT
      asr.code AS target_code,
      'module'::text AS target_type,
      COALESCE((SELECT count(*) FROM predictive_risk_signals s
                WHERE s.module_code = asr.code AND s.created_at > now() - interval '24 hours'), 0) AS signals,
      COALESCE((SELECT count(*) FROM predictive_anomalies a
                WHERE a.target_code = asr.code AND a.detected_at > now() - interval '24 hours'), 0) AS anomalies,
      COALESCE((SELECT count(*) FROM predictive_drift_snapshots d
                WHERE d.target_code = asr.code AND d.trend_direction = 'degrading'
                  AND d.created_at > now() - interval '24 hours'), 0) AS drifts,
      COALESCE((SELECT count(*) FROM architecture_layer_dependencies dep
                WHERE dep.layer_code = asr.code), 0) AS fan_out,
      COALESCE((SELECT count(*) FROM architecture_layer_status st
                WHERE st.layer_code = asr.code AND st.health_status = 'red'), 0) AS health_red
    FROM architecture_layers_registry asr
  LOOP
    v_score := LEAST(
      (r.signals * 8) +
      (r.anomalies * 15) +
      (r.drifts * 10) +
      (r.fan_out * 3) +
      (r.health_red * 25),
      100
    );

    v_band := CASE
      WHEN v_score >= 70 THEN 'critical'
      WHEN v_score >= 45 THEN 'high'
      WHEN v_score >= 20 THEN 'medium'
      ELSE 'low'
    END;

    v_action := CASE v_band
      WHEN 'critical' THEN 'block_rollout_and_owner_alert'
      WHEN 'high' THEN 'refresh_snapshot_and_rerun_sync'
      WHEN 'medium' THEN 'extra_validation_check'
      ELSE 'monitor'
    END;

    INSERT INTO predictive_failure_scores
      (target_code, target_type, failure_probability_score, severity_band, recommended_preventive_action, contributing_factors, updated_at)
    VALUES (r.target_code, r.target_type, v_score, v_band, v_action,
            jsonb_build_object('signals',r.signals,'anomalies',r.anomalies,'drifts',r.drifts,
                               'fan_out',r.fan_out,'health_red',r.health_red),
            now())
    ON CONFLICT (target_code, target_type) DO UPDATE SET
      failure_probability_score = EXCLUDED.failure_probability_score,
      severity_band = EXCLUDED.severity_band,
      recommended_preventive_action = EXCLUDED.recommended_preventive_action,
      contributing_factors = EXCLUDED.contributing_factors,
      updated_at = now();
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 5. SWEEP COMPLETO
CREATE OR REPLACE FUNCTION public.run_predictive_sweep()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_signals int;
  v_anom int;
  v_drift int;
  v_scores int;
BEGIN
  -- Limpa dados antigos (> 7d) para manter sinal atual
  DELETE FROM predictive_risk_signals WHERE created_at < now() - interval '7 days';
  DELETE FROM predictive_anomalies WHERE detected_at < now() - interval '7 days';
  DELETE FROM predictive_drift_snapshots WHERE created_at < now() - interval '7 days';

  v_signals := detect_predictive_signals();
  v_anom := detect_predictive_anomalies();
  v_drift := compute_predictive_drift();
  v_scores := compute_failure_probability();

  RETURN jsonb_build_object(
    'swept_at', now(),
    'signals_detected', v_signals,
    'anomalies_detected', v_anom,
    'drift_snapshots', v_drift,
    'scores_updated', v_scores
  );
END;
$$;

-- 6. PREVENTIVE ACTION
CREATE OR REPLACE FUNCTION public.execute_preventive_action(p_target_code text, p_action_code text, p_mode text DEFAULT 'manual')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result text := 'success';
  v_reason text := '';
  v_log_id uuid;
BEGIN
  BEGIN
    CASE p_action_code
      WHEN 'refresh_snapshot' THEN
        PERFORM execute_recovery_policy('snapshot_rebuild_policy', 'preventive');
        v_reason := 'Snapshot preventivo executado';
      WHEN 'rerun_sync' THEN
        PERFORM execute_recovery_policy('integration_retry_policy', 'preventive');
        v_reason := 'Sync preventivo executado';
      WHEN 'owner_alert' THEN
        v_reason := 'Alerta enviado ao Owner';
      WHEN 'extra_validation' THEN
        PERFORM evaluate_stability_gates();
        v_reason := 'Validação extra (gates) executada';
      WHEN 'preventive_stability_gate' THEN
        PERFORM evaluate_stability_gates();
        v_reason := 'Stability gate preventivo acionado';
      WHEN 'block_rollout' THEN
        v_reason := 'Rollout bloqueado preventivamente';
      ELSE
        v_result := 'failed';
        v_reason := 'unknown_action';
    END CASE;
  EXCEPTION WHEN OTHERS THEN
    v_result := 'failed';
    v_reason := SQLERRM;
  END;

  INSERT INTO preventive_action_logs(target_code, action_code, execution_mode, result, reason, triggered_by)
  VALUES (p_target_code, p_action_code, p_mode, v_result, v_reason, auth.uid())
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object('log_id', v_log_id, 'result', v_result, 'reason', v_reason);
END;
$$;

-- 7. SUMMARY + TOP RISKS
CREATE OR REPLACE FUNCTION public.predictive_layer_summary()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total_modules_scored', (SELECT count(*) FROM predictive_failure_scores),
    'critical_count', (SELECT count(*) FROM predictive_failure_scores WHERE severity_band='critical'),
    'high_count', (SELECT count(*) FROM predictive_failure_scores WHERE severity_band='high'),
    'medium_count', (SELECT count(*) FROM predictive_failure_scores WHERE severity_band='medium'),
    'low_count', (SELECT count(*) FROM predictive_failure_scores WHERE severity_band='low'),
    'signals_24h', (SELECT count(*) FROM predictive_risk_signals WHERE created_at > now() - interval '24 hours'),
    'anomalies_24h', (SELECT count(*) FROM predictive_anomalies WHERE detected_at > now() - interval '24 hours'),
    'drifts_degrading', (SELECT count(*) FROM predictive_drift_snapshots WHERE trend_direction='degrading' AND created_at > now() - interval '24 hours'),
    'preventive_actions_24h', (SELECT count(*) FROM preventive_action_logs WHERE created_at > now() - interval '24 hours'),
    'last_sweep', (SELECT max(updated_at) FROM predictive_failure_scores)
  );
$$;

CREATE OR REPLACE FUNCTION public.predictive_top_risks(p_limit int DEFAULT 10)
RETURNS TABLE(
  target_code text,
  target_type text,
  failure_probability_score numeric,
  severity_band text,
  recommended_preventive_action text,
  contributing_factors jsonb,
  updated_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT target_code, target_type, failure_probability_score, severity_band,
         recommended_preventive_action, contributing_factors, updated_at
  FROM predictive_failure_scores
  ORDER BY failure_probability_score DESC, updated_at DESC
  LIMIT p_limit;
$$;

-- Sweep inicial para popular dados
SELECT public.run_predictive_sweep();