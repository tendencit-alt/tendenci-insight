-- ============================================================
-- RECOVERY ACTIONS LAYER
-- ============================================================

CREATE TABLE public.recovery_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  target_module TEXT NOT NULL,
  recovery_type TEXT NOT NULL DEFAULT 'assisted_recovery' CHECK (recovery_type IN ('safe_auto_recovery','assisted_recovery','protected_recovery')),
  is_safe_auto BOOLEAN NOT NULL DEFAULT false,
  requires_owner_confirmation BOOLEAN NOT NULL DEFAULT true,
  is_retriable BOOLEAN NOT NULL DEFAULT true,
  max_retry_attempts INT NOT NULL DEFAULT 3,
  handler_kind TEXT NOT NULL DEFAULT 'edge_function' CHECK (handler_kind IN ('edge_function','sql_rpc','noop')),
  handler_target TEXT,
  estimated_duration_seconds INT DEFAULT 15,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recovery_catalog_module ON public.recovery_catalog(target_module);
CREATE INDEX idx_recovery_catalog_safe_auto ON public.recovery_catalog(is_safe_auto) WHERE is_safe_auto = true;

CREATE TABLE public.auto_recovery_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  failure_code TEXT NOT NULL,
  recovery_code TEXT NOT NULL REFERENCES public.recovery_catalog(code) ON DELETE CASCADE,
  trigger_mode TEXT NOT NULL DEFAULT 'auto' CHECK (trigger_mode IN ('auto','assisted','manual_only')),
  max_attempts INT NOT NULL DEFAULT 3,
  backoff_strategy TEXT NOT NULL DEFAULT 'exponential' CHECK (backoff_strategy IN ('immediate','linear','exponential')),
  cooldown_minutes INT NOT NULL DEFAULT 5,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (failure_code, recovery_code)
);

CREATE INDEX idx_arr_failure ON public.auto_recovery_rules(failure_code) WHERE is_enabled = true;

CREATE TABLE public.recovery_execution_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  failure_code TEXT NOT NULL,
  recovery_code TEXT NOT NULL,
  source_module TEXT,
  target_module TEXT,
  incident_group_id UUID,
  related_event_id UUID,
  executed_by UUID,
  execution_mode TEXT NOT NULL DEFAULT 'manual' CHECK (execution_mode IN ('auto','manual','assisted','scheduled')),
  result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending','success','failed','skipped','cancelled')),
  attempt_number INT NOT NULL DEFAULT 1,
  message TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  response JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rel_failure ON public.recovery_execution_logs(failure_code, started_at DESC);
CREATE INDEX idx_rel_recovery ON public.recovery_execution_logs(recovery_code, started_at DESC);
CREATE INDEX idx_rel_module ON public.recovery_execution_logs(target_module);
CREATE INDEX idx_rel_pending ON public.recovery_execution_logs(result) WHERE result = 'pending';
CREATE UNIQUE INDEX idx_rel_idempotency ON public.recovery_execution_logs(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- RLS
ALTER TABLE public.recovery_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_recovery_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner/admin manage recovery catalog" ON public.recovery_catalog
  FOR ALL USING (public.is_owner() OR public.is_admin())
  WITH CHECK (public.is_owner() OR public.is_admin());

CREATE POLICY "Owner/admin manage auto recovery rules" ON public.auto_recovery_rules
  FOR ALL USING (public.is_owner() OR public.is_admin())
  WITH CHECK (public.is_owner() OR public.is_admin());

CREATE POLICY "Owner/admin read recovery logs" ON public.recovery_execution_logs
  FOR SELECT USING (public.is_owner() OR public.is_admin());

CREATE POLICY "System inserts recovery logs" ON public.recovery_execution_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owner/admin update recovery logs" ON public.recovery_execution_logs
  FOR UPDATE USING (public.is_owner() OR public.is_admin());

-- ============================================================
-- REGISTRO IDEMPOTENTE
-- ============================================================
CREATE OR REPLACE FUNCTION public.register_recovery_execution(
  p_failure_code TEXT,
  p_recovery_code TEXT,
  p_execution_mode TEXT DEFAULT 'manual',
  p_target_module TEXT DEFAULT NULL,
  p_incident_group_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_attempt INT;
BEGIN
  -- Idempotência
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_id FROM recovery_execution_logs WHERE idempotency_key = p_idempotency_key;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;

  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_attempt
  FROM recovery_execution_logs
  WHERE failure_code = p_failure_code AND recovery_code = p_recovery_code
    AND started_at >= now() - interval '24 hours';

  INSERT INTO recovery_execution_logs (
    failure_code, recovery_code, target_module, incident_group_id,
    executed_by, execution_mode, attempt_number, idempotency_key
  ) VALUES (
    p_failure_code, p_recovery_code, p_target_module, p_incident_group_id,
    auth.uid(), p_execution_mode, v_attempt, p_idempotency_key
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ============================================================
-- BUSCAR RECOVERIES AUTO PENDENTES
-- ============================================================
CREATE OR REPLACE FUNCTION public.find_pending_auto_recoveries()
RETURNS TABLE (
  failure_code TEXT,
  recovery_code TEXT,
  target_module TEXT,
  attempts_so_far INT,
  max_attempts INT,
  cooldown_minutes INT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH failed_modules AS (
    SELECT DISTINCT
      'integration_red'::TEXT AS failure_code,
      ihs.source_module_code AS module_code
    FROM integration_health_snapshots ihs
    WHERE ihs.current_status = 'red'
      AND (ihs.last_error_at IS NULL OR ihs.last_error_at >= now() - interval '1 hour')
    UNION
    SELECT DISTINCT
      'cascade_critical'::TEXT,
      die.failed_module_code
    FROM dependency_impact_events die
    WHERE die.impact_status = 'active' AND die.impact_level = 'critical'
  ),
  candidates AS (
    SELECT
      fm.failure_code,
      arr.recovery_code,
      fm.module_code AS target_module,
      arr.max_attempts,
      arr.cooldown_minutes,
      (SELECT COUNT(*)::int FROM recovery_execution_logs rel
       WHERE rel.failure_code = fm.failure_code
         AND rel.recovery_code = arr.recovery_code
         AND rel.target_module = fm.module_code
         AND rel.started_at >= now() - interval '24 hours') AS attempts_so_far,
      (SELECT MAX(rel.started_at) FROM recovery_execution_logs rel
       WHERE rel.failure_code = fm.failure_code
         AND rel.recovery_code = arr.recovery_code
         AND rel.target_module = fm.module_code) AS last_attempt_at
    FROM failed_modules fm
    JOIN auto_recovery_rules arr ON arr.failure_code = fm.failure_code
    JOIN recovery_catalog rc ON rc.code = arr.recovery_code
    WHERE arr.is_enabled = true
      AND arr.trigger_mode = 'auto'
      AND rc.is_safe_auto = true
      AND rc.active = true
  )
  SELECT
    c.failure_code, c.recovery_code, c.target_module,
    c.attempts_so_far, c.max_attempts, c.cooldown_minutes
  FROM candidates c
  WHERE c.attempts_so_far < c.max_attempts
    AND (c.last_attempt_at IS NULL OR c.last_attempt_at < now() - (c.cooldown_minutes || ' minutes')::interval);
END;
$$;

-- ============================================================
-- OVERVIEW (KPIs)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_recovery_overview()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total_24h INT;
  v_success_24h INT;
  v_failed_24h INT;
  v_pending INT;
  v_auto_24h INT;
  v_manual_24h INT;
  v_avg_duration NUMERIC;
  v_top_recovery TEXT;
  v_top_failing_module TEXT;
BEGIN
  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE result = 'success')::int,
    COUNT(*) FILTER (WHERE result = 'failed')::int,
    COUNT(*) FILTER (WHERE result = 'pending')::int,
    COUNT(*) FILTER (WHERE execution_mode = 'auto')::int,
    COUNT(*) FILTER (WHERE execution_mode = 'manual')::int,
    AVG(duration_ms) FILTER (WHERE result = 'success' AND duration_ms IS NOT NULL)
  INTO v_total_24h, v_success_24h, v_failed_24h, v_pending, v_auto_24h, v_manual_24h, v_avg_duration
  FROM recovery_execution_logs
  WHERE started_at >= now() - interval '24 hours';

  SELECT recovery_code INTO v_top_recovery
  FROM recovery_execution_logs
  WHERE started_at >= now() - interval '7 days'
  GROUP BY recovery_code
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  SELECT target_module INTO v_top_failing_module
  FROM recovery_execution_logs
  WHERE started_at >= now() - interval '7 days' AND target_module IS NOT NULL
  GROUP BY target_module
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'total_24h', COALESCE(v_total_24h, 0),
    'success_24h', COALESCE(v_success_24h, 0),
    'failed_24h', COALESCE(v_failed_24h, 0),
    'pending', COALESCE(v_pending, 0),
    'auto_24h', COALESCE(v_auto_24h, 0),
    'manual_24h', COALESCE(v_manual_24h, 0),
    'success_rate', CASE WHEN COALESCE(v_total_24h,0) > 0
      THEN ROUND((v_success_24h::numeric / v_total_24h) * 100, 1) ELSE 0 END,
    'avg_duration_ms', COALESCE(v_avg_duration, 0),
    'top_recovery_code', v_top_recovery,
    'top_failing_module', v_top_failing_module
  );
END;
$$;

-- ============================================================
-- SEED CATALOG
-- ============================================================
INSERT INTO public.recovery_catalog (code, name, description, target_module, recovery_type, is_safe_auto, requires_owner_confirmation, is_retriable, max_retry_attempts, handler_kind, handler_target, risk_level) VALUES
  ('retry_integration_sync', 'Retry de sincronização de integração', 'Reexecuta o reconciliador de integration_health para o módulo afetado', 'integration_map', 'safe_auto_recovery', true, false, true, 3, 'edge_function', 'reconcile-integration-health', 'low'),
  ('reprocess_billing_to_entitlements', 'Reprocessar Billing → Entitlements', 'Recalcula entitlements baseado no plano ativo', 'entitlements', 'assisted_recovery', false, true, true, 3, 'sql_rpc', 'recompute_tenant_entitlements', 'medium'),
  ('recalculate_health_score', 'Recalcular Health Score', 'Reexecuta motor de health score', 'health_score', 'safe_auto_recovery', true, false, true, 3, 'sql_rpc', 'refresh_dependency_impact_snapshots', 'low'),
  ('rerun_lifecycle_snapshot', 'Reexecutar snapshot de Lifecycle', 'Recalcula estágio de ciclo de vida do tenant', 'lifecycle', 'assisted_recovery', false, true, true, 3, 'edge_function', 'lifecycle-snapshot', 'low'),
  ('rerun_upgrade_signals', 'Recalcular Upgrade Signals', 'Reanalisa sinais de upgrade', 'upgrade_experience', 'safe_auto_recovery', true, false, true, 3, 'edge_function', 'detect-upgrade-signals', 'low'),
  ('retry_forecast_build', 'Retry de Forecast', 'Refaz o build do forecast com base no CRM', 'forecast', 'assisted_recovery', false, true, true, 2, 'edge_function', 'forecast-rebuild', 'medium'),
  ('retry_inventory_consumption_sync', 'Retry de baixa de estoque', 'Reexecuta consumo Produção → Estoque', 'estoque', 'protected_recovery', false, true, true, 2, 'sql_rpc', 'retry_inventory_consumption', 'high'),
  ('reopen_failed_job', 'Reabrir job falho', 'Reenfileira último job de automação falho', 'automations', 'assisted_recovery', false, true, true, 3, 'sql_rpc', 'reopen_failed_automation_job', 'medium'),
  ('refresh_control_tower_snapshot', 'Atualizar snapshot do Control Tower', 'Recalcula KPIs globais', 'control_tower', 'safe_auto_recovery', true, false, true, 3, 'edge_function', 'control-tower-refresh', 'low'),
  ('reanalyze_dependency_impact', 'Reanalisar impacto de dependências', 'Roda analyze_dependency_impact()', 'dependency_impact', 'safe_auto_recovery', true, false, true, 3, 'sql_rpc', 'analyze_dependency_impact', 'low')
ON CONFLICT (code) DO NOTHING;

-- SEED RULES
INSERT INTO public.auto_recovery_rules (failure_code, recovery_code, trigger_mode, max_attempts, backoff_strategy, cooldown_minutes) VALUES
  ('integration_red', 'retry_integration_sync', 'auto', 3, 'exponential', 5),
  ('integration_red', 'reanalyze_dependency_impact', 'auto', 2, 'linear', 10),
  ('cascade_critical', 'refresh_control_tower_snapshot', 'auto', 2, 'exponential', 15),
  ('cascade_critical', 'recalculate_health_score', 'auto', 2, 'exponential', 15),
  ('billing_to_entitlements_failed', 'reprocess_billing_to_entitlements', 'assisted', 3, 'exponential', 10),
  ('lifecycle_snapshot_failed', 'rerun_lifecycle_snapshot', 'assisted', 3, 'linear', 10),
  ('forecast_build_failed', 'retry_forecast_build', 'assisted', 2, 'exponential', 15),
  ('automation_job_failed', 'reopen_failed_job', 'assisted', 3, 'linear', 5)
ON CONFLICT (failure_code, recovery_code) DO NOTHING;