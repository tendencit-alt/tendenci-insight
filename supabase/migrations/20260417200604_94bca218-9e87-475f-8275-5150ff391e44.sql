-- =========================================================
-- SELF-HEALING POLICY LAYER
-- =========================================================

-- 1) Policy registry per action
CREATE TABLE IF NOT EXISTS public.self_healing_policy_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_code text NOT NULL,
  module_code text,
  safety_level text NOT NULL DEFAULT 'semi_auto'
    CHECK (safety_level IN ('safe_auto','semi_auto','manual_only','critical_manual')),
  max_auto_attempts int NOT NULL DEFAULT 3,
  cooldown_seconds int NOT NULL DEFAULT 300,
  retry_window_minutes int NOT NULL DEFAULT 60,
  requires_root_cause_confidence numeric NOT NULL DEFAULT 0.6,
  requires_dependency_stability boolean NOT NULL DEFAULT false,
  requires_owner_confirmation boolean NOT NULL DEFAULT false,
  max_dependency_depth int NOT NULL DEFAULT 3,
  allowed_severity_scope text[] NOT NULL DEFAULT ARRAY['low','medium','high'],
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(action_code, module_code)
);

-- 2) Retry budgets (rolling window per action+module)
CREATE TABLE IF NOT EXISTS public.self_healing_retry_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_code text NOT NULL,
  module_code text,
  attempts_count int NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz,
  last_result text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(action_code, module_code)
);

-- 3) Guardrail evaluation logs
CREATE TABLE IF NOT EXISTS public.self_healing_guardrail_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  action_code text NOT NULL,
  module_code text,
  incident_id uuid,
  decision text NOT NULL CHECK (decision IN ('allow','block','escalate')),
  reason text,
  severity text,
  root_cause_confidence numeric,
  dependency_depth int,
  retry_count int,
  policy_snapshot jsonb,
  context jsonb
);

CREATE INDEX IF NOT EXISTS idx_sh_guardrail_logs_eval ON public.self_healing_guardrail_logs(evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sh_guardrail_logs_action ON public.self_healing_guardrail_logs(action_code);
CREATE INDEX IF NOT EXISTS idx_sh_guardrail_logs_decision ON public.self_healing_guardrail_logs(decision);

-- 4) Escalations to Owner
CREATE TABLE IF NOT EXISTS public.self_healing_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  action_code text,
  module_code text,
  incident_id uuid,
  trigger_reason text NOT NULL,
  severity text NOT NULL DEFAULT 'high',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','dismissed')),
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  resolution_note text,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_sh_escalations_status ON public.self_healing_escalations(status, created_at DESC);

-- 5) Post-recovery stability checks
CREATE TABLE IF NOT EXISTS public.self_healing_stability_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at timestamptz NOT NULL DEFAULT now(),
  recovery_log_id uuid,
  incident_id uuid,
  module_code text,
  integration_health_ok boolean,
  dependency_stable boolean,
  snapshot_fresh boolean,
  timeline_clean boolean,
  overall_stable boolean,
  duration_observed_seconds int,
  details jsonb
);

CREATE INDEX IF NOT EXISTS idx_sh_stability_checked ON public.self_healing_stability_checks(checked_at DESC);

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.self_healing_policy_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_healing_retry_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_healing_guardrail_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_healing_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_healing_stability_checks ENABLE ROW LEVEL SECURITY;

-- Owner-only access (uses existing has_role helper if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN
    EXECUTE $p$
      CREATE POLICY "owner_all_policies" ON public.self_healing_policy_registry
        FOR ALL TO authenticated
        USING (public.has_role(auth.uid(), 'owner'))
        WITH CHECK (public.has_role(auth.uid(), 'owner'));
    $p$;
    EXECUTE $p$
      CREATE POLICY "owner_all_budgets" ON public.self_healing_retry_budgets
        FOR ALL TO authenticated
        USING (public.has_role(auth.uid(), 'owner'))
        WITH CHECK (public.has_role(auth.uid(), 'owner'));
    $p$;
    EXECUTE $p$
      CREATE POLICY "owner_read_guardrail_logs" ON public.self_healing_guardrail_logs
        FOR SELECT TO authenticated
        USING (public.has_role(auth.uid(), 'owner'));
    $p$;
    EXECUTE $p$
      CREATE POLICY "owner_all_escalations" ON public.self_healing_escalations
        FOR ALL TO authenticated
        USING (public.has_role(auth.uid(), 'owner'))
        WITH CHECK (public.has_role(auth.uid(), 'owner'));
    $p$;
    EXECUTE $p$
      CREATE POLICY "owner_read_stability" ON public.self_healing_stability_checks
        FOR SELECT TO authenticated
        USING (public.has_role(auth.uid(), 'owner'));
    $p$;
  END IF;
END$$;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_shpr_touch ON public.self_healing_policy_registry;
CREATE TRIGGER trg_shpr_touch BEFORE UPDATE ON public.self_healing_policy_registry
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_shrb_touch ON public.self_healing_retry_budgets;
CREATE TRIGGER trg_shrb_touch BEFORE UPDATE ON public.self_healing_retry_budgets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- FUNCTIONS
-- =========================================================

-- Evaluate guardrails before executing a recovery action
CREATE OR REPLACE FUNCTION public.evaluate_self_healing_guardrails(
  p_action_code text,
  p_module_code text DEFAULT NULL,
  p_severity text DEFAULT 'medium',
  p_root_cause_confidence numeric DEFAULT NULL,
  p_dependency_depth int DEFAULT 0,
  p_incident_id uuid DEFAULT NULL,
  p_context jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy public.self_healing_policy_registry%ROWTYPE;
  v_budget public.self_healing_retry_budgets%ROWTYPE;
  v_decision text := 'allow';
  v_reason text := 'ok';
  v_log_id uuid;
BEGIN
  SELECT * INTO v_policy FROM public.self_healing_policy_registry
   WHERE action_code = p_action_code
     AND (module_code = p_module_code OR module_code IS NULL)
     AND active = true
   ORDER BY (module_code IS NOT NULL) DESC
   LIMIT 1;

  IF NOT FOUND THEN
    -- No policy → default to semi_auto allow but log
    v_decision := 'allow';
    v_reason := 'no_policy_default_allow';
  ELSE
    -- Manual-only blocks any auto execution
    IF v_policy.safety_level IN ('manual_only','critical_manual') THEN
      v_decision := 'block';
      v_reason := 'safety_level_' || v_policy.safety_level;
    -- Severity scope
    ELSIF NOT (p_severity = ANY(v_policy.allowed_severity_scope)) THEN
      v_decision := 'block';
      v_reason := 'severity_out_of_scope';
    -- Confidence
    ELSIF v_policy.requires_root_cause_confidence > 0
          AND COALESCE(p_root_cause_confidence, 0) < v_policy.requires_root_cause_confidence THEN
      v_decision := 'escalate';
      v_reason := 'low_root_cause_confidence';
    -- Dependency depth
    ELSIF p_dependency_depth > v_policy.max_dependency_depth THEN
      v_decision := 'escalate';
      v_reason := 'dependency_depth_exceeded';
    ELSE
      -- Retry budget
      SELECT * INTO v_budget FROM public.self_healing_retry_budgets
       WHERE action_code = p_action_code
         AND COALESCE(module_code,'') = COALESCE(p_module_code,'');

      IF FOUND THEN
        -- Reset window if expired
        IF v_budget.window_started_at < now() - (v_policy.retry_window_minutes || ' minutes')::interval THEN
          UPDATE public.self_healing_retry_budgets
             SET attempts_count = 0, window_started_at = now()
           WHERE id = v_budget.id;
          v_budget.attempts_count := 0;
        END IF;

        IF v_budget.attempts_count >= v_policy.max_auto_attempts THEN
          v_decision := 'escalate';
          v_reason := 'retry_budget_exceeded';
        ELSIF v_budget.last_attempt_at IS NOT NULL
              AND v_budget.last_attempt_at > now() - (v_policy.cooldown_seconds || ' seconds')::interval THEN
          v_decision := 'block';
          v_reason := 'cooldown_active';
        END IF;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.self_healing_guardrail_logs (
    action_code, module_code, incident_id, decision, reason,
    severity, root_cause_confidence, dependency_depth,
    retry_count, policy_snapshot, context
  ) VALUES (
    p_action_code, p_module_code, p_incident_id, v_decision, v_reason,
    p_severity, p_root_cause_confidence, p_dependency_depth,
    COALESCE(v_budget.attempts_count, 0),
    to_jsonb(v_policy), p_context
  ) RETURNING id INTO v_log_id;

  IF v_decision = 'escalate' THEN
    INSERT INTO public.self_healing_escalations (
      action_code, module_code, incident_id, trigger_reason, severity, metadata
    ) VALUES (
      p_action_code, p_module_code, p_incident_id, v_reason, p_severity,
      jsonb_build_object('guardrail_log_id', v_log_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'decision', v_decision,
    'reason', v_reason,
    'log_id', v_log_id,
    'policy', to_jsonb(v_policy)
  );
END $$;

-- Consume retry budget after an attempt
CREATE OR REPLACE FUNCTION public.consume_retry_budget(
  p_action_code text,
  p_module_code text DEFAULT NULL,
  p_result text DEFAULT 'unknown'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.self_healing_retry_budgets (action_code, module_code, attempts_count, last_attempt_at, last_result)
  VALUES (p_action_code, p_module_code, 1, now(), p_result)
  ON CONFLICT (action_code, module_code) DO UPDATE
    SET attempts_count = public.self_healing_retry_budgets.attempts_count + 1,
        last_attempt_at = now(),
        last_result = EXCLUDED.last_result,
        updated_at = now();
END $$;

-- Reset retry budget (e.g., after successful stability)
CREATE OR REPLACE FUNCTION public.reset_retry_budget(
  p_action_code text,
  p_module_code text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.self_healing_retry_budgets
     SET attempts_count = 0, window_started_at = now(), updated_at = now()
   WHERE action_code = p_action_code
     AND COALESCE(module_code,'') = COALESCE(p_module_code,'');
END $$;

-- Verify post-recovery stability
CREATE OR REPLACE FUNCTION public.verify_post_recovery_stability(
  p_recovery_log_id uuid,
  p_module_code text DEFAULT NULL,
  p_incident_id uuid DEFAULT NULL,
  p_observation_seconds int DEFAULT 300
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_health_ok boolean := true;
  v_dep_stable boolean := true;
  v_snap_fresh boolean := true;
  v_tl_clean boolean := true;
  v_overall boolean;
  v_id uuid;
BEGIN
  -- integration_health_events: any failure in last N seconds for module?
  IF p_module_code IS NOT NULL AND to_regclass('public.integration_health_events') IS NOT NULL THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM public.integration_health_events
       WHERE module_code = p_module_code
         AND status IN ('failed','degraded','error')
         AND created_at > now() - make_interval(secs => p_observation_seconds)
    ) INTO v_health_ok;
  END IF;

  -- dependency_impact_events: stable if no high-severity propagation recently
  IF p_module_code IS NOT NULL AND to_regclass('public.dependency_impact_events') IS NOT NULL THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM public.dependency_impact_events
       WHERE source_module = p_module_code
         AND severity IN ('high','critical')
         AND created_at > now() - make_interval(secs => p_observation_seconds)
    ) INTO v_dep_stable;
  END IF;

  -- timeline clean
  IF p_incident_id IS NOT NULL AND to_regclass('public.incident_timeline_events') IS NOT NULL THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM public.incident_timeline_events
       WHERE incident_id = p_incident_id
         AND severity IN ('high','critical')
         AND event_time > now() - make_interval(secs => p_observation_seconds)
    ) INTO v_tl_clean;
  END IF;

  v_overall := v_health_ok AND v_dep_stable AND v_snap_fresh AND v_tl_clean;

  INSERT INTO public.self_healing_stability_checks (
    recovery_log_id, incident_id, module_code,
    integration_health_ok, dependency_stable, snapshot_fresh, timeline_clean,
    overall_stable, duration_observed_seconds,
    details
  ) VALUES (
    p_recovery_log_id, p_incident_id, p_module_code,
    v_health_ok, v_dep_stable, v_snap_fresh, v_tl_clean,
    v_overall, p_observation_seconds,
    jsonb_build_object('checked_at', now())
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'check_id', v_id,
    'overall_stable', v_overall,
    'integration_health_ok', v_health_ok,
    'dependency_stable', v_dep_stable,
    'snapshot_fresh', v_snap_fresh,
    'timeline_clean', v_tl_clean
  );
END $$;

-- Overview KPIs for the panel
CREATE OR REPLACE FUNCTION public.get_self_healing_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'policies_total', (SELECT count(*) FROM public.self_healing_policy_registry WHERE active),
    'policies_safe_auto', (SELECT count(*) FROM public.self_healing_policy_registry WHERE active AND safety_level='safe_auto'),
    'policies_manual', (SELECT count(*) FROM public.self_healing_policy_registry WHERE active AND safety_level IN ('manual_only','critical_manual')),
    'evaluations_24h', (SELECT count(*) FROM public.self_healing_guardrail_logs WHERE evaluated_at > now() - interval '24 hours'),
    'allowed_24h', (SELECT count(*) FROM public.self_healing_guardrail_logs WHERE evaluated_at > now() - interval '24 hours' AND decision='allow'),
    'blocked_24h', (SELECT count(*) FROM public.self_healing_guardrail_logs WHERE evaluated_at > now() - interval '24 hours' AND decision='block'),
    'escalated_24h', (SELECT count(*) FROM public.self_healing_guardrail_logs WHERE evaluated_at > now() - interval '24 hours' AND decision='escalate'),
    'open_escalations', (SELECT count(*) FROM public.self_healing_escalations WHERE status='open'),
    'stability_checks_24h', (SELECT count(*) FROM public.self_healing_stability_checks WHERE checked_at > now() - interval '24 hours'),
    'stability_pass_rate', (
      SELECT COALESCE(round(100.0 * sum(CASE WHEN overall_stable THEN 1 ELSE 0 END) / NULLIF(count(*),0), 2), 0)
      FROM public.self_healing_stability_checks WHERE checked_at > now() - interval '24 hours'
    )
  ) INTO v_result;
  RETURN v_result;
END $$;

-- Acknowledge / resolve escalation
CREATE OR REPLACE FUNCTION public.resolve_self_healing_escalation(
  p_id uuid,
  p_status text,
  p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('acknowledged','resolved','dismissed') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  UPDATE public.self_healing_escalations
     SET status = p_status,
         acknowledged_by = COALESCE(acknowledged_by, auth.uid()),
         acknowledged_at = COALESCE(acknowledged_at, now()),
         resolved_at = CASE WHEN p_status IN ('resolved','dismissed') THEN now() ELSE resolved_at END,
         resolution_note = COALESCE(p_note, resolution_note)
   WHERE id = p_id;
END $$;

-- Seed default policies for known recovery actions (safe defaults)
INSERT INTO public.self_healing_policy_registry (action_code, module_code, safety_level, max_auto_attempts, cooldown_seconds, requires_root_cause_confidence, max_dependency_depth, allowed_severity_scope, notes)
SELECT code,
       target_module,
       CASE
         WHEN recovery_type = 'protected_recovery' THEN 'manual_only'
         WHEN recovery_type = 'critical' THEN 'critical_manual'
         ELSE 'semi_auto'
       END,
       3, 300, 0.6, 3, ARRAY['low','medium','high'],
       'auto-seeded'
  FROM public.recovery_catalog
 WHERE active = true
ON CONFLICT (action_code, module_code) DO NOTHING;
