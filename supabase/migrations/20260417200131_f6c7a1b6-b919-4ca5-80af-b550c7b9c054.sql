-- =====================================================
-- RUNBOOK AUTOMATION LAYER
-- =====================================================

-- 1. CATALOG
CREATE TABLE IF NOT EXISTS public.runbook_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  incident_type TEXT NOT NULL,
  target_module TEXT NOT NULL,
  severity_scope TEXT[] DEFAULT ARRAY['moderate','high','critical']::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_start_allowed BOOLEAN NOT NULL DEFAULT false,
  owner_confirmation_required BOOLEAN NOT NULL DEFAULT true,
  is_fallback BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_runbook_catalog_module ON public.runbook_catalog(target_module);
CREATE INDEX IF NOT EXISTS idx_runbook_catalog_active ON public.runbook_catalog(is_active);

-- 2. STEPS
CREATE TABLE IF NOT EXISTS public.runbook_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  runbook_code TEXT NOT NULL REFERENCES public.runbook_catalog(code) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  action_code TEXT NOT NULL,
  execution_mode TEXT NOT NULL DEFAULT 'auto' CHECK (execution_mode IN ('auto','manual','assisted')),
  retry_policy JSONB DEFAULT '{"max_attempts":2,"backoff":"linear"}'::jsonb,
  timeout_seconds INTEGER NOT NULL DEFAULT 300,
  rollback_action TEXT,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(runbook_code, step_order)
);
CREATE INDEX IF NOT EXISTS idx_runbook_steps_runbook ON public.runbook_steps(runbook_code, step_order);

-- 3. VALIDATION GATES
CREATE TABLE IF NOT EXISTS public.runbook_validation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  runbook_code TEXT NOT NULL REFERENCES public.runbook_catalog(code) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  validation_type TEXT NOT NULL CHECK (validation_type IN ('sql_count','sql_value','health_status','none')),
  validation_query TEXT,
  expected_result JSONB,
  on_failure_action TEXT NOT NULL DEFAULT 'escalate' CHECK (on_failure_action IN ('retry','escalate','fail','skip')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_runbook_validation_runbook ON public.runbook_validation_rules(runbook_code, step_order);

-- 4. ESCALATION RULES
CREATE TABLE IF NOT EXISTS public.runbook_escalation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  runbook_code TEXT NOT NULL REFERENCES public.runbook_catalog(code) ON DELETE CASCADE,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('step_failed_n_times','low_root_confidence','cascade_critical','critical_step_failed','timeout_exceeded')),
  threshold NUMERIC,
  escalation_action TEXT NOT NULL,
  requires_owner BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_runbook_escalation_runbook ON public.runbook_escalation_rules(runbook_code);

-- 5. EXECUTIONS
CREATE TABLE IF NOT EXISTS public.runbook_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  runbook_code TEXT NOT NULL REFERENCES public.runbook_catalog(code),
  incident_id UUID REFERENCES public.system_incidents(id) ON DELETE SET NULL,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('auto','owner','admin','schedule')),
  triggered_user_id UUID,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('queued','running','succeeded','failed','escalated','cancelled')),
  current_step_order INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  succeeded_steps INTEGER DEFAULT 0,
  failed_steps INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  result_summary TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_runbook_exec_runbook ON public.runbook_executions(runbook_code, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runbook_exec_incident ON public.runbook_executions(incident_id);
CREATE INDEX IF NOT EXISTS idx_runbook_exec_status ON public.runbook_executions(status);

-- 6. STEP EXECUTIONS
CREATE TABLE IF NOT EXISTS public.runbook_step_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES public.runbook_executions(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  action_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','succeeded','failed','skipped','validation_failed','escalated')),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  recovery_log_id UUID,
  validation_result JSONB,
  message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_step_exec_execution ON public.runbook_step_executions(execution_id, step_order);

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE public.runbook_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runbook_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runbook_validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runbook_escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runbook_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runbook_step_executions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "owner_all_runbook_catalog" ON public.runbook_catalog FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner_all_runbook_steps" ON public.runbook_steps FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner_all_runbook_validation" ON public.runbook_validation_rules FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner_all_runbook_escalation" ON public.runbook_escalation_rules FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner_all_runbook_executions" ON public.runbook_executions FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "owner_all_step_executions" ON public.runbook_step_executions FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.tg_runbook_catalog_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_runbook_catalog_updated ON public.runbook_catalog;
CREATE TRIGGER trg_runbook_catalog_updated BEFORE UPDATE ON public.runbook_catalog
FOR EACH ROW EXECUTE FUNCTION public.tg_runbook_catalog_updated_at();

CREATE OR REPLACE FUNCTION public.tg_runbook_execution_finished()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.finished_at IS NOT NULL AND OLD.finished_at IS NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.finished_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_runbook_exec_finished ON public.runbook_executions;
CREATE TRIGGER trg_runbook_exec_finished BEFORE UPDATE ON public.runbook_executions
FOR EACH ROW EXECUTE FUNCTION public.tg_runbook_execution_finished();

-- =====================================================
-- MATCHER: incident -> runbook
-- =====================================================
CREATE OR REPLACE FUNCTION public.match_runbook_for_incident(p_incident_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inc RECORD;
  v_code TEXT;
BEGIN
  SELECT * INTO v_inc FROM public.system_incidents WHERE id = p_incident_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Score ponderado: módulo origem + severidade + ativo
  SELECT rc.code INTO v_code
  FROM public.runbook_catalog rc
  WHERE rc.is_active = true
    AND rc.is_fallback = false
    AND rc.target_module = v_inc.origin_module_code
    AND v_inc.severity = ANY(rc.severity_scope)
  ORDER BY
    (CASE WHEN rc.target_module = COALESCE(v_inc.root_cause_module, v_inc.origin_module_code) THEN 10 ELSE 5 END) +
    (CASE WHEN v_inc.severity = 'critical' AND 'critical' = ANY(rc.severity_scope) THEN 5 ELSE 0 END) DESC
  LIMIT 1;

  -- Fallback: runbook genérico do módulo
  IF v_code IS NULL THEN
    SELECT code INTO v_code
    FROM public.runbook_catalog
    WHERE is_active = true AND is_fallback = true AND target_module = v_inc.origin_module_code
    LIMIT 1;
  END IF;

  RETURN v_code;
END;
$$;

-- =====================================================
-- START EXECUTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.start_runbook_execution(
  p_runbook_code TEXT,
  p_incident_id UUID DEFAULT NULL,
  p_triggered_by TEXT DEFAULT 'owner'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.runbook_steps WHERE runbook_code = p_runbook_code;

  INSERT INTO public.runbook_executions (
    runbook_code, incident_id, triggered_by, triggered_user_id, total_steps, current_step_order, status
  ) VALUES (
    p_runbook_code, p_incident_id, p_triggered_by, auth.uid(), v_total, 1, 'queued'
  ) RETURNING id INTO v_id;

  -- Pre-create step executions
  INSERT INTO public.runbook_step_executions (execution_id, step_order, action_code, status)
  SELECT v_id, step_order, action_code, 'pending'
  FROM public.runbook_steps WHERE runbook_code = p_runbook_code
  ORDER BY step_order;

  RETURN v_id;
END;
$$;

-- =====================================================
-- COMPLETE STEP (called by edge executor)
-- =====================================================
CREATE OR REPLACE FUNCTION public.complete_runbook_step(
  p_execution_id UUID,
  p_step_order INTEGER,
  p_status TEXT,
  p_message TEXT DEFAULT NULL,
  p_recovery_log_id UUID DEFAULT NULL,
  p_validation_result JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exec RECORD;
  v_next INTEGER;
  v_total INTEGER;
BEGIN
  UPDATE public.runbook_step_executions
  SET status = p_status,
      message = p_message,
      recovery_log_id = COALESCE(p_recovery_log_id, recovery_log_id),
      validation_result = COALESCE(p_validation_result, validation_result),
      finished_at = now(),
      duration_ms = COALESCE(EXTRACT(EPOCH FROM (now() - started_at))::INTEGER * 1000, 0)
  WHERE execution_id = p_execution_id AND step_order = p_step_order;

  SELECT * INTO v_exec FROM public.runbook_executions WHERE id = p_execution_id;
  v_total := v_exec.total_steps;

  IF p_status = 'succeeded' THEN
    UPDATE public.runbook_executions SET succeeded_steps = succeeded_steps + 1 WHERE id = p_execution_id;
  ELSIF p_status IN ('failed','validation_failed') THEN
    UPDATE public.runbook_executions SET failed_steps = failed_steps + 1 WHERE id = p_execution_id;
  END IF;

  -- Determine next step
  SELECT MIN(step_order) INTO v_next
  FROM public.runbook_step_executions
  WHERE execution_id = p_execution_id AND status = 'pending' AND step_order > p_step_order;

  IF p_status IN ('failed','validation_failed','escalated') THEN
    UPDATE public.runbook_executions
    SET status = CASE WHEN p_status='escalated' THEN 'escalated' ELSE 'failed' END,
        finished_at = now(),
        result_summary = COALESCE(p_message, 'Step ' || p_step_order || ' ' || p_status)
    WHERE id = p_execution_id;
    RETURN jsonb_build_object('next_step', NULL, 'execution_status', p_status);
  END IF;

  IF v_next IS NULL THEN
    UPDATE public.runbook_executions
    SET status = 'succeeded', finished_at = now(), result_summary = 'All steps completed'
    WHERE id = p_execution_id;
    RETURN jsonb_build_object('next_step', NULL, 'execution_status', 'succeeded');
  END IF;

  UPDATE public.runbook_executions SET current_step_order = v_next WHERE id = p_execution_id;
  RETURN jsonb_build_object('next_step', v_next, 'execution_status', 'running');
END;
$$;

-- =====================================================
-- ANALYTICS
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_runbook_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_runbooks', (SELECT COUNT(*) FROM public.runbook_catalog WHERE is_active = true),
    'executions_30d', (SELECT COUNT(*) FROM public.runbook_executions WHERE started_at >= now() - interval '30 days'),
    'success_rate_30d', (
      SELECT COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE status='succeeded') / NULLIF(COUNT(*),0))::INTEGER, 0)
      FROM public.runbook_executions WHERE started_at >= now() - interval '30 days'
    ),
    'escalation_rate_30d', (
      SELECT COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE status='escalated') / NULLIF(COUNT(*),0))::INTEGER, 0)
      FROM public.runbook_executions WHERE started_at >= now() - interval '30 days'
    ),
    'avg_duration_seconds', (
      SELECT COALESCE(AVG(duration_seconds),0)::INTEGER
      FROM public.runbook_executions WHERE finished_at IS NOT NULL AND started_at >= now() - interval '30 days'
    ),
    'top_runbooks', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('runbook_code', runbook_code, 'count', c, 'success_pct', success_pct) ORDER BY c DESC), '[]'::jsonb)
      FROM (
        SELECT runbook_code, COUNT(*) c,
               ROUND(100.0 * COUNT(*) FILTER (WHERE status='succeeded') / NULLIF(COUNT(*),0))::INTEGER AS success_pct
        FROM public.runbook_executions
        WHERE started_at >= now() - interval '30 days'
        GROUP BY runbook_code ORDER BY 2 DESC LIMIT 10
      ) t
    ),
    'failing_steps', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('action_code', action_code, 'fail_count', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (
        SELECT action_code, COUNT(*) c
        FROM public.runbook_step_executions
        WHERE status IN ('failed','validation_failed') AND created_at >= now() - interval '30 days'
        GROUP BY action_code ORDER BY 2 DESC LIMIT 10
      ) t
    )
  ) INTO v;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_pending_runbook_incidents()
RETURNS TABLE (incident_id UUID, runbook_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT si.id, public.match_runbook_for_incident(si.id)
  FROM public.system_incidents si
  WHERE si.current_status IN ('open','investigating')
    AND si.started_at >= now() - interval '6 hours'
    AND NOT EXISTS (
      SELECT 1 FROM public.runbook_executions re
      WHERE re.incident_id = si.id AND re.status IN ('queued','running','succeeded')
    )
    AND public.match_runbook_for_incident(si.id) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.runbook_catalog rc
      WHERE rc.code = public.match_runbook_for_incident(si.id) AND rc.auto_start_allowed = true
    );
END;
$$;

-- =====================================================
-- SEED: 6 standard runbooks
-- =====================================================
INSERT INTO public.runbook_catalog (code, name, description, incident_type, target_module, severity_scope, auto_start_allowed, owner_confirmation_required, is_fallback) VALUES
  ('billing_sync_failure_runbook', 'Billing Sync Failure', 'Reprocessa billing→entitlements e revalida snapshot', 'sync_failure', 'billing', ARRAY['high','critical'], true, false, false),
  ('lifecycle_batch_timeout_runbook', 'Lifecycle Batch Timeout', 'Reexecuta snapshot de lifecycle e libera lock', 'timeout', 'lifecycle', ARRAY['moderate','high','critical'], true, false, false),
  ('crm_forecast_delay_runbook', 'CRM Forecast Delay', 'Recalcula forecast CRM e atualiza Control Tower', 'delay', 'crm', ARRAY['moderate','high'], false, true, false),
  ('inventory_consumption_sync_runbook', 'Inventory Consumption Sync', 'Reprocessa consumo de estoque pendente', 'sync_failure', 'inventory', ARRAY['moderate','high','critical'], true, false, false),
  ('entitlement_snapshot_stale_runbook', 'Entitlement Snapshot Stale', 'Recalcula snapshot de entitlements desatualizado', 'stale_data', 'entitlements', ARRAY['high','critical'], true, false, false),
  ('control_tower_data_inconsistency_runbook', 'Control Tower Data Inconsistency', 'Recalcula health score e refresh global do Control Tower', 'inconsistency', 'control_tower', ARRAY['high','critical'], false, true, false),
  ('generic_module_recovery_runbook', 'Generic Module Recovery', 'Runbook fallback genérico (retry sync + recalc health)', 'generic', 'any', ARRAY['low','moderate','high','critical'], false, true, true)
ON CONFLICT (code) DO NOTHING;

-- Steps for billing_sync_failure
INSERT INTO public.runbook_steps (runbook_code, step_order, step_name, action_code, execution_mode, is_critical) VALUES
  ('billing_sync_failure_runbook', 1, 'Retry billing sync', 'retry_integration_sync', 'auto', true),
  ('billing_sync_failure_runbook', 2, 'Reprocess billing→entitlements', 'reprocess_billing_to_entitlements', 'auto', true),
  ('billing_sync_failure_runbook', 3, 'Recalculate health score', 'recalculate_health_score', 'auto', false)
ON CONFLICT DO NOTHING;

-- Steps for lifecycle_batch_timeout
INSERT INTO public.runbook_steps (runbook_code, step_order, step_name, action_code, execution_mode, is_critical) VALUES
  ('lifecycle_batch_timeout_runbook', 1, 'Rerun lifecycle snapshot', 'rerun_lifecycle_snapshot', 'auto', true),
  ('lifecycle_batch_timeout_runbook', 2, 'Recalculate health score', 'recalculate_health_score', 'auto', false)
ON CONFLICT DO NOTHING;

-- Steps for crm_forecast_delay
INSERT INTO public.runbook_steps (runbook_code, step_order, step_name, action_code, execution_mode, is_critical) VALUES
  ('crm_forecast_delay_runbook', 1, 'Retry forecast build', 'retry_forecast_build', 'auto', true),
  ('crm_forecast_delay_runbook', 2, 'Refresh control tower snapshot', 'refresh_control_tower_snapshot', 'auto', false)
ON CONFLICT DO NOTHING;

-- Steps for inventory_consumption_sync
INSERT INTO public.runbook_steps (runbook_code, step_order, step_name, action_code, execution_mode, is_critical) VALUES
  ('inventory_consumption_sync_runbook', 1, 'Retry inventory consumption sync', 'retry_inventory_consumption_sync', 'auto', true),
  ('inventory_consumption_sync_runbook', 2, 'Recalculate health score', 'recalculate_health_score', 'auto', false)
ON CONFLICT DO NOTHING;

-- Steps for entitlement_snapshot_stale
INSERT INTO public.runbook_steps (runbook_code, step_order, step_name, action_code, execution_mode, is_critical) VALUES
  ('entitlement_snapshot_stale_runbook', 1, 'Reprocess billing→entitlements', 'reprocess_billing_to_entitlements', 'auto', true),
  ('entitlement_snapshot_stale_runbook', 2, 'Refresh control tower snapshot', 'refresh_control_tower_snapshot', 'auto', false)
ON CONFLICT DO NOTHING;

-- Steps for control_tower_data_inconsistency
INSERT INTO public.runbook_steps (runbook_code, step_order, step_name, action_code, execution_mode, is_critical) VALUES
  ('control_tower_data_inconsistency_runbook', 1, 'Recalculate health score', 'recalculate_health_score', 'auto', true),
  ('control_tower_data_inconsistency_runbook', 2, 'Refresh control tower snapshot', 'refresh_control_tower_snapshot', 'auto', true)
ON CONFLICT DO NOTHING;

-- Generic fallback
INSERT INTO public.runbook_steps (runbook_code, step_order, step_name, action_code, execution_mode, is_critical) VALUES
  ('generic_module_recovery_runbook', 1, 'Retry integration sync', 'retry_integration_sync', 'auto', false),
  ('generic_module_recovery_runbook', 2, 'Recalculate health score', 'recalculate_health_score', 'auto', false)
ON CONFLICT DO NOTHING;

-- Escalation rules
INSERT INTO public.runbook_escalation_rules (runbook_code, condition_type, threshold, escalation_action, requires_owner) VALUES
  ('billing_sync_failure_runbook', 'step_failed_n_times', 2, 'notify_owner', true),
  ('billing_sync_failure_runbook', 'critical_step_failed', NULL, 'notify_owner', true),
  ('lifecycle_batch_timeout_runbook', 'step_failed_n_times', 2, 'notify_owner', true),
  ('control_tower_data_inconsistency_runbook', 'critical_step_failed', NULL, 'notify_owner', true)
ON CONFLICT DO NOTHING;

-- Validation gates (sql_count: expected 0 errors)
INSERT INTO public.runbook_validation_rules (runbook_code, step_order, validation_type, validation_query, expected_result, on_failure_action) VALUES
  ('billing_sync_failure_runbook', 2, 'sql_count',
    'SELECT COUNT(*) FROM integration_health_snapshots WHERE module_code=''billing'' AND status=''red'' AND last_check_at >= now() - interval ''5 minutes''',
    '{"max":0}'::jsonb, 'escalate'),
  ('control_tower_data_inconsistency_runbook', 2, 'sql_count',
    'SELECT COUNT(*) FROM integration_health_snapshots WHERE status=''red'' AND last_check_at >= now() - interval ''5 minutes''',
    '{"max":0}'::jsonb, 'escalate')
ON CONFLICT DO NOTHING;