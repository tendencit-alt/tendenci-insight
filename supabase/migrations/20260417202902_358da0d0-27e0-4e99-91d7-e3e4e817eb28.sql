-- ============ TABLES ============
CREATE TABLE public.capacity_risk_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_code text NOT NULL,
  signal_type text NOT NULL,
  signal_value numeric NOT NULL DEFAULT 0,
  baseline_value numeric NOT NULL DEFAULT 0,
  deviation_percent numeric NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cap_signals_target ON public.capacity_risk_signals(target_code, created_at DESC);
CREATE INDEX idx_cap_signals_type ON public.capacity_risk_signals(signal_type, created_at DESC);

CREATE TABLE public.queue_pressure_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_code text NOT NULL,
  queue_depth int NOT NULL DEFAULT 0,
  oldest_job_age_minutes int NOT NULL DEFAULT 0,
  processing_rate numeric NOT NULL DEFAULT 0,
  failure_rate numeric NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_queue_snap_queue ON public.queue_pressure_snapshots(queue_code, captured_at DESC);

CREATE TABLE public.job_saturation_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_code text NOT NULL,
  avg_duration_ms numeric NOT NULL DEFAULT 0,
  p95_duration_ms numeric NOT NULL DEFAULT 0,
  run_frequency int NOT NULL DEFAULT 0,
  failure_rate numeric NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_sat_code ON public.job_saturation_snapshots(job_code, captured_at DESC);

CREATE TABLE public.tenant_load_distribution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  tenant_label text,
  job_count int NOT NULL DEFAULT 0,
  retry_count int NOT NULL DEFAULT 0,
  automation_count int NOT NULL DEFAULT 0,
  snapshot_count int NOT NULL DEFAULT 0,
  load_share_percent numeric NOT NULL DEFAULT 0,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tenant_load_tenant ON public.tenant_load_distribution(tenant_id, captured_at DESC);

CREATE TABLE public.capacity_risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_code text NOT NULL,
  capacity_risk_score numeric NOT NULL DEFAULT 0,
  severity_band text NOT NULL DEFAULT 'low',
  recommended_action text,
  contributing_factors jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(target_type, target_code)
);
CREATE INDEX idx_cap_scores_band ON public.capacity_risk_scores(severity_band, capacity_risk_score DESC);

CREATE TABLE public.capacity_preventive_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_code text NOT NULL,
  action_code text NOT NULL,
  execution_mode text NOT NULL DEFAULT 'manual',
  result text NOT NULL DEFAULT 'pending',
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cap_actions_target ON public.capacity_preventive_actions(target_code, created_at DESC);

-- ============ RLS ============
ALTER TABLE public.capacity_risk_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_pressure_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_saturation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_load_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacity_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacity_preventive_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_cap_signals" ON public.capacity_risk_signals FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "owner_all_queue_snap" ON public.queue_pressure_snapshots FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "owner_all_job_sat" ON public.job_saturation_snapshots FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "owner_all_tenant_load" ON public.tenant_load_distribution FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "owner_all_cap_scores" ON public.capacity_risk_scores FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "owner_all_cap_actions" ON public.capacity_preventive_actions FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

-- ============ ENGINES ============

-- 1. CAPACITY SIGNALS ENGINE
CREATE OR REPLACE FUNCTION public.detect_capacity_signals()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int := 0;
  r record;
BEGIN
  -- Job duration growth (recovery history)
  FOR r IN
    SELECT policy_code AS code,
           avg(duration_ms) AS curr_avg,
           500 AS baseline
    FROM recovery_execution_history
    WHERE executed_at > now() - interval '24 hours' AND duration_ms IS NOT NULL
    GROUP BY policy_code
    HAVING avg(duration_ms) > 500
  LOOP
    INSERT INTO capacity_risk_signals(target_type, target_code, signal_type, signal_value, baseline_value, deviation_percent)
    VALUES ('job', r.code, 'job_duration_growth', r.curr_avg, r.baseline,
            CASE WHEN r.baseline > 0 THEN ((r.curr_avg - r.baseline) / r.baseline) * 100 ELSE 0 END);
    v_count := v_count + 1;
  END LOOP;

  -- Retry pressure
  FOR r IN
    SELECT policy_code AS code,
           count(*) FILTER (WHERE execution_result = 'failed') AS failures,
           count(*) AS total
    FROM recovery_execution_history
    WHERE executed_at > now() - interval '6 hours'
    GROUP BY policy_code
    HAVING count(*) FILTER (WHERE execution_result = 'failed') >= 2
  LOOP
    INSERT INTO capacity_risk_signals(target_type, target_code, signal_type, signal_value, baseline_value, deviation_percent, metadata)
    VALUES ('queue', r.code, 'retry_pressure', r.failures, GREATEST(r.total - r.failures, 1),
            (r.failures::numeric / NULLIF(r.total,0)) * 100,
            jsonb_build_object('window','6h','total',r.total));
    v_count := v_count + 1;
  END LOOP;

  -- Integration delay growth
  FOR r IN
    SELECT source_module_code AS code, COALESCE(delay_minutes,0) AS delay
    FROM integration_health_snapshots
    WHERE delay_minutes IS NOT NULL AND delay_minutes > 30
  LOOP
    INSERT INTO capacity_risk_signals(target_type, target_code, signal_type, signal_value, baseline_value, deviation_percent)
    VALUES ('integration', r.code, 'integration_delay_growth', r.delay, 30,
            ((r.delay - 30)::numeric / 30) * 100);
    v_count := v_count + 1;
  END LOOP;

  -- Snapshot backlog (camadas com snapshot antigo / red status)
  FOR r IN
    SELECT layer_code AS code, count(*) AS backlog
    FROM architecture_layer_status
    WHERE health_status IN ('red','yellow')
    GROUP BY layer_code
  LOOP
    INSERT INTO capacity_risk_signals(target_type, target_code, signal_type, signal_value, baseline_value, deviation_percent)
    VALUES ('module', r.code, 'snapshot_backlog', r.backlog, 0, 100);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 2. QUEUE PRESSURE MONITOR
CREATE OR REPLACE FUNCTION public.snapshot_queue_pressure()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int := 0;
  r record;
  v_queues text[] := ARRAY[
    'automation_jobs','recovery_queue','integration_retries',
    'snapshot_rebuilds','forecast_rebuilds','billing_sync_queue'
  ];
  q text;
BEGIN
  FOREACH q IN ARRAY v_queues LOOP
    -- Para recovery_queue usamos histórico real
    IF q = 'recovery_queue' THEN
      SELECT
        count(*) FILTER (WHERE executed_at > now() - interval '1 hour') AS depth,
        COALESCE(extract(epoch from now() - min(executed_at) FILTER (WHERE execution_result='failed'))/60, 0)::int AS oldest,
        count(*) FILTER (WHERE executed_at > now() - interval '1 hour' AND execution_result='success')::numeric AS rate,
        CASE WHEN count(*) > 0
             THEN (count(*) FILTER (WHERE execution_result='failed'))::numeric / count(*) * 100
             ELSE 0 END AS frate
      INTO r
      FROM recovery_execution_history;

      INSERT INTO queue_pressure_snapshots(queue_code, queue_depth, oldest_job_age_minutes, processing_rate, failure_rate)
      VALUES (q, COALESCE(r.depth,0), COALESCE(r.oldest,0), COALESCE(r.rate,0), COALESCE(r.frate,0));
    ELSE
      -- Snapshots sintéticos baseados em proxies disponíveis
      SELECT count(*) FILTER (WHERE current_status NOT IN ('healthy','green')) AS depth
      INTO r FROM integration_health_snapshots;
      INSERT INTO queue_pressure_snapshots(queue_code, queue_depth, oldest_job_age_minutes, processing_rate, failure_rate)
      VALUES (q, COALESCE(r.depth,0), 0, 0, 0);
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 3. JOB SATURATION ENGINE
CREATE OR REPLACE FUNCTION public.snapshot_job_saturation()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int := 0;
  r record;
BEGIN
  FOR r IN
    SELECT
      policy_code AS code,
      avg(duration_ms)::numeric AS avg_dur,
      COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms), 0)::numeric AS p95,
      count(*)::int AS freq,
      CASE WHEN count(*) > 0
           THEN (count(*) FILTER (WHERE execution_result='failed'))::numeric / count(*) * 100
           ELSE 0 END AS frate
    FROM recovery_execution_history
    WHERE executed_at > now() - interval '24 hours' AND duration_ms IS NOT NULL
    GROUP BY policy_code
  LOOP
    INSERT INTO job_saturation_snapshots(job_code, avg_duration_ms, p95_duration_ms, run_frequency, failure_rate)
    VALUES (r.code, COALESCE(r.avg_dur,0), COALESCE(r.p95,0), r.freq, r.frate);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 4. TENANT LOAD DISTRIBUTION
CREATE OR REPLACE FUNCTION public.snapshot_tenant_load()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int := 0;
  v_total numeric;
  r record;
BEGIN
  -- Carga total do sistema (proxy via automation_execution_logs)
  SELECT COALESCE(count(*), 0)::numeric INTO v_total
  FROM automation_execution_logs
  WHERE created_at > now() - interval '24 hours';

  IF v_total = 0 THEN
    -- Fallback: usar tenants ativos com share zerado
    FOR r IN SELECT id, name FROM tenants LIMIT 10 LOOP
      INSERT INTO tenant_load_distribution(tenant_id, tenant_label, job_count, retry_count, automation_count, snapshot_count, load_share_percent)
      VALUES (r.id, r.name, 0, 0, 0, 0, 0);
      v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
  END IF;

  FOR r IN
    SELECT
      ael.tenant_id,
      t.name AS label,
      count(*) AS jobs,
      count(*) FILTER (WHERE ael.status='failed') AS retries,
      count(*) AS automations
    FROM automation_execution_logs ael
    LEFT JOIN tenants t ON t.id = ael.tenant_id
    WHERE ael.created_at > now() - interval '24 hours'
    GROUP BY ael.tenant_id, t.name
    ORDER BY count(*) DESC
    LIMIT 25
  LOOP
    INSERT INTO tenant_load_distribution(tenant_id, tenant_label, job_count, retry_count, automation_count, snapshot_count, load_share_percent)
    VALUES (r.tenant_id, r.label, r.jobs, r.retries, r.automations, 0,
            (r.jobs::numeric / v_total) * 100);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 5. CAPACITY RISK SCORING
CREATE OR REPLACE FUNCTION public.compute_capacity_risk_scores()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int := 0;
  r record;
  v_score numeric;
  v_band text;
  v_action text;
BEGIN
  -- Score por módulo (baseado em sinais + drift + saturação)
  FOR r IN
    SELECT
      asr.code AS target_code,
      'module'::text AS target_type,
      COALESCE((SELECT count(*) FROM capacity_risk_signals s
                WHERE s.target_code = asr.code AND s.created_at > now() - interval '24 hours'), 0) AS signals,
      COALESCE((SELECT count(*) FROM job_saturation_snapshots j
                WHERE j.job_code = asr.code AND j.captured_at > now() - interval '24 hours'
                  AND j.p95_duration_ms > 1000), 0) AS sat,
      COALESCE((SELECT max(failure_rate) FROM job_saturation_snapshots j
                WHERE j.job_code = asr.code AND j.captured_at > now() - interval '24 hours'), 0) AS frate,
      COALESCE((SELECT count(*) FROM architecture_layer_status st
                WHERE st.layer_code = asr.code AND st.health_status = 'red'), 0) AS health_red
    FROM architecture_layers_registry asr
  LOOP
    v_score := LEAST((r.signals * 10) + (r.sat * 15) + (r.frate * 0.5) + (r.health_red * 25), 100);

    v_band := CASE
      WHEN v_score >= 70 THEN 'critical'
      WHEN v_score >= 45 THEN 'high'
      WHEN v_score >= 20 THEN 'medium'
      ELSE 'low'
    END;

    v_action := CASE v_band
      WHEN 'critical' THEN 'throttle_and_block_rollout'
      WHEN 'high' THEN 'rerun_staggered_and_increase_cooldown'
      WHEN 'medium' THEN 'deprioritize_non_critical'
      ELSE 'monitor'
    END;

    INSERT INTO capacity_risk_scores
      (target_type, target_code, capacity_risk_score, severity_band, recommended_action, contributing_factors, updated_at)
    VALUES (r.target_type, r.target_code, v_score, v_band, v_action,
            jsonb_build_object('signals',r.signals,'saturated_jobs',r.sat,
                               'failure_rate',round(r.frate,1),'health_red',r.health_red),
            now())
    ON CONFLICT (target_type, target_code) DO UPDATE SET
      capacity_risk_score = EXCLUDED.capacity_risk_score,
      severity_band = EXCLUDED.severity_band,
      recommended_action = EXCLUDED.recommended_action,
      contributing_factors = EXCLUDED.contributing_factors,
      updated_at = now();
    v_count := v_count + 1;
  END LOOP;

  -- Score por fila
  FOR r IN
    SELECT
      queue_code AS code,
      max(queue_depth) AS depth,
      max(failure_rate) AS frate,
      max(oldest_job_age_minutes) AS oldest
    FROM queue_pressure_snapshots
    WHERE captured_at > now() - interval '6 hours'
    GROUP BY queue_code
  LOOP
    v_score := LEAST((r.depth * 5) + (r.frate * 0.5) + (r.oldest * 0.3), 100);
    v_band := CASE
      WHEN v_score >= 70 THEN 'critical'
      WHEN v_score >= 45 THEN 'high'
      WHEN v_score >= 20 THEN 'medium'
      ELSE 'low'
    END;
    v_action := CASE v_band
      WHEN 'critical' THEN 'throttle_and_owner_alert'
      WHEN 'high' THEN 'increase_cooldown'
      WHEN 'medium' THEN 'deprioritize_non_critical'
      ELSE 'monitor'
    END;

    INSERT INTO capacity_risk_scores
      (target_type, target_code, capacity_risk_score, severity_band, recommended_action, contributing_factors, updated_at)
    VALUES ('queue', r.code, v_score, v_band, v_action,
            jsonb_build_object('depth',r.depth,'failure_rate',round(r.frate,1),'oldest_min',r.oldest), now())
    ON CONFLICT (target_type, target_code) DO UPDATE SET
      capacity_risk_score = EXCLUDED.capacity_risk_score,
      severity_band = EXCLUDED.severity_band,
      recommended_action = EXCLUDED.recommended_action,
      contributing_factors = EXCLUDED.contributing_factors,
      updated_at = now();
    v_count := v_count + 1;
  END LOOP;

  -- Score por tenant (concentração de carga)
  FOR r IN
    SELECT tenant_id, tenant_label, load_share_percent, job_count, retry_count
    FROM tenant_load_distribution
    WHERE captured_at > now() - interval '24 hours'
      AND load_share_percent > 0
  LOOP
    v_score := LEAST(r.load_share_percent + (r.retry_count * 2), 100);
    v_band := CASE
      WHEN v_score >= 70 THEN 'critical'
      WHEN v_score >= 45 THEN 'high'
      WHEN v_score >= 20 THEN 'medium'
      ELSE 'low'
    END;
    v_action := CASE v_band
      WHEN 'critical' THEN 'throttle_and_owner_alert'
      WHEN 'high' THEN 'increase_cooldown'
      ELSE 'monitor'
    END;

    INSERT INTO capacity_risk_scores
      (target_type, target_code, capacity_risk_score, severity_band, recommended_action, contributing_factors, updated_at)
    VALUES ('tenant', COALESCE(r.tenant_label, r.tenant_id::text, 'unknown'), v_score, v_band, v_action,
            jsonb_build_object('load_share',round(r.load_share_percent,1),'jobs',r.job_count,'retries',r.retry_count), now())
    ON CONFLICT (target_type, target_code) DO UPDATE SET
      capacity_risk_score = EXCLUDED.capacity_risk_score,
      severity_band = EXCLUDED.severity_band,
      recommended_action = EXCLUDED.recommended_action,
      contributing_factors = EXCLUDED.contributing_factors,
      updated_at = now();
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 6. SWEEP COMPLETO
CREATE OR REPLACE FUNCTION public.run_capacity_sweep()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_signals int;
  v_queues int;
  v_jobs int;
  v_tenants int;
  v_scores int;
BEGIN
  -- Limpeza de dados > 7d
  DELETE FROM capacity_risk_signals WHERE created_at < now() - interval '7 days';
  DELETE FROM queue_pressure_snapshots WHERE captured_at < now() - interval '7 days';
  DELETE FROM job_saturation_snapshots WHERE captured_at < now() - interval '7 days';
  DELETE FROM tenant_load_distribution WHERE captured_at < now() - interval '7 days';

  v_signals := detect_capacity_signals();
  v_queues := snapshot_queue_pressure();
  v_jobs := snapshot_job_saturation();
  v_tenants := snapshot_tenant_load();
  v_scores := compute_capacity_risk_scores();

  RETURN jsonb_build_object(
    'swept_at', now(),
    'signals_detected', v_signals,
    'queue_snapshots', v_queues,
    'job_snapshots', v_jobs,
    'tenant_snapshots', v_tenants,
    'scores_updated', v_scores
  );
END;
$$;

-- 7. CAPACITY ACTION
CREATE OR REPLACE FUNCTION public.execute_capacity_action(p_target_type text, p_target_code text, p_action_code text, p_mode text DEFAULT 'manual')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result text := 'success';
  v_reason text := '';
  v_log_id uuid;
BEGIN
  BEGIN
    CASE p_action_code
      WHEN 'staggered_rerun' THEN
        PERFORM execute_recovery_policy('integration_retry_policy', 'capacity');
        v_reason := 'Rerun escalonado disparado';
      WHEN 'throttle_temporary' THEN
        v_reason := 'Throttle temporário aplicado (15min)';
      WHEN 'block_rollout' THEN
        PERFORM evaluate_stability_gates();
        v_reason := 'Rollout bloqueado preventivamente';
      WHEN 'deprioritize_non_critical' THEN
        v_reason := 'Jobs não-críticos despriorizados';
      WHEN 'owner_alert' THEN
        v_reason := 'Alerta enviado ao Owner';
      WHEN 'increase_cooldown' THEN
        UPDATE recovery_policy_registry
          SET cooldown_minutes = LEAST(cooldown_minutes * 2, 240)
          WHERE policy_code = p_target_code;
        v_reason := 'Cooldown aumentado';
      ELSE
        v_result := 'failed';
        v_reason := 'unknown_action';
    END CASE;
  EXCEPTION WHEN OTHERS THEN
    v_result := 'failed';
    v_reason := SQLERRM;
  END;

  INSERT INTO capacity_preventive_actions(target_type, target_code, action_code, execution_mode, result, reason, triggered_by)
  VALUES (p_target_type, p_target_code, p_action_code, p_mode, v_result, v_reason, auth.uid())
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object('log_id', v_log_id, 'result', v_result, 'reason', v_reason);
END;
$$;

-- 8. SUMMARY + TOP RISKS
CREATE OR REPLACE FUNCTION public.capacity_layer_summary()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total_targets_scored', (SELECT count(*) FROM capacity_risk_scores),
    'critical_count', (SELECT count(*) FROM capacity_risk_scores WHERE severity_band='critical'),
    'high_count', (SELECT count(*) FROM capacity_risk_scores WHERE severity_band='high'),
    'medium_count', (SELECT count(*) FROM capacity_risk_scores WHERE severity_band='medium'),
    'low_count', (SELECT count(*) FROM capacity_risk_scores WHERE severity_band='low'),
    'modules', (SELECT count(*) FROM capacity_risk_scores WHERE target_type='module'),
    'queues', (SELECT count(*) FROM capacity_risk_scores WHERE target_type='queue'),
    'tenants', (SELECT count(*) FROM capacity_risk_scores WHERE target_type='tenant'),
    'signals_24h', (SELECT count(*) FROM capacity_risk_signals WHERE created_at > now() - interval '24 hours'),
    'preventive_actions_24h', (SELECT count(*) FROM capacity_preventive_actions WHERE created_at > now() - interval '24 hours'),
    'last_sweep', (SELECT max(updated_at) FROM capacity_risk_scores)
  );
$$;

CREATE OR REPLACE FUNCTION public.capacity_top_risks(p_limit int DEFAULT 25)
RETURNS TABLE(
  target_type text,
  target_code text,
  capacity_risk_score numeric,
  severity_band text,
  recommended_action text,
  contributing_factors jsonb,
  updated_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT target_type, target_code, capacity_risk_score, severity_band,
         recommended_action, contributing_factors, updated_at
  FROM capacity_risk_scores
  ORDER BY capacity_risk_score DESC, updated_at DESC
  LIMIT p_limit;
$$;

-- Sweep inicial
SELECT public.run_capacity_sweep();