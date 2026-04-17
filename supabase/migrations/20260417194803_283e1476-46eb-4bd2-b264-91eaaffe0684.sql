-- =====================================================
-- INCIDENT TIMELINE ENGINE
-- =====================================================

-- 1. SYSTEM INCIDENTS (master)
CREATE TABLE IF NOT EXISTS public.system_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_code TEXT NOT NULL UNIQUE,
  origin_module_code TEXT NOT NULL,
  current_status TEXT NOT NULL DEFAULT 'open' CHECK (current_status IN ('open','investigating','recovering','resolved','resolved_with_degradation','reopened')),
  severity TEXT NOT NULL DEFAULT 'moderate' CHECK (severity IN ('low','moderate','high','critical')),
  title TEXT,
  summary TEXT,
  impacted_modules TEXT[] DEFAULT ARRAY[]::TEXT[],
  root_cause_module TEXT,
  root_cause_confidence INTEGER DEFAULT 0,
  recovery_attempts INTEGER DEFAULT 0,
  recovery_success_count INTEGER DEFAULT 0,
  detection_lag_seconds INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_incidents_status ON public.system_incidents(current_status);
CREATE INDEX IF NOT EXISTS idx_system_incidents_module ON public.system_incidents(origin_module_code);
CREATE INDEX IF NOT EXISTS idx_system_incidents_started ON public.system_incidents(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_incidents_severity ON public.system_incidents(severity);

-- 2. TIMELINE EVENTS (normalized)
CREATE TABLE IF NOT EXISTS public.incident_timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.system_incidents(id) ON DELETE CASCADE,
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  module_code TEXT NOT NULL,
  event_source TEXT NOT NULL CHECK (event_source IN ('integration_health','dependency_impact','automation_log','recovery_log','audit_log','root_cause','manual')),
  event_type TEXT NOT NULL,
  event_role TEXT DEFAULT 'derived' CHECK (event_role IN ('root','derived','aggravation','stabilization','recovery','resolution')),
  severity TEXT DEFAULT 'moderate' CHECK (severity IN ('low','moderate','high','critical','info')),
  message TEXT NOT NULL,
  actor_type TEXT DEFAULT 'system' CHECK (actor_type IN ('system','owner','admin','auto','ai')),
  actor_id UUID,
  source_record_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timeline_incident ON public.incident_timeline_events(incident_id, event_time);
CREATE INDEX IF NOT EXISTS idx_timeline_module ON public.incident_timeline_events(module_code);
CREATE INDEX IF NOT EXISTS idx_timeline_source ON public.incident_timeline_events(event_source);
CREATE INDEX IF NOT EXISTS idx_timeline_role ON public.incident_timeline_events(event_role);

-- 3. STATUS HISTORY
CREATE TABLE IF NOT EXISTS public.incident_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.system_incidents(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID,
  change_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_history_incident ON public.incident_status_history(incident_id, created_at);

-- 4. ROOT CAUSE SUMMARY
CREATE TABLE IF NOT EXISTS public.incident_root_cause_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL UNIQUE REFERENCES public.system_incidents(id) ON DELETE CASCADE,
  root_module_code TEXT NOT NULL,
  root_event_id UUID,
  confidence_score INTEGER NOT NULL DEFAULT 50,
  diagnosis TEXT,
  suggested_action TEXT,
  ai_generated BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rcs_module ON public.incident_root_cause_summary(root_module_code);

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE public.system_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_root_cause_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_system_incidents" ON public.system_incidents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true));

CREATE POLICY "owner_all_timeline_events" ON public.incident_timeline_events
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true));

CREATE POLICY "owner_all_status_history" ON public.incident_status_history
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true));

CREATE POLICY "owner_all_root_cause_summary" ON public.incident_root_cause_summary
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true));

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.tg_system_incidents_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.resolved_at IS NOT NULL AND OLD.resolved_at IS NULL THEN
    NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.resolved_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_system_incidents_updated ON public.system_incidents;
CREATE TRIGGER trg_system_incidents_updated
BEFORE UPDATE ON public.system_incidents
FOR EACH ROW EXECUTE FUNCTION public.tg_system_incidents_updated_at();

CREATE OR REPLACE FUNCTION public.tg_incident_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_status IS DISTINCT FROM OLD.current_status THEN
    INSERT INTO public.incident_status_history (incident_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.current_status, NEW.current_status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incident_status_change ON public.system_incidents;
CREATE TRIGGER trg_incident_status_change
AFTER UPDATE ON public.system_incidents
FOR EACH ROW EXECUTE FUNCTION public.tg_incident_status_change();

-- =====================================================
-- INCIDENT GROUPER (heuristic SQL)
-- =====================================================
CREATE OR REPLACE FUNCTION public.group_and_normalize_incidents(
  p_window_minutes INTEGER DEFAULT 10,
  p_lookback_hours INTEGER DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident_id UUID;
  v_incident_code TEXT;
  v_created INTEGER := 0;
  v_events_added INTEGER := 0;
  v_anchor RECORD;
  v_existing UUID;
  v_severity TEXT;
BEGIN
  -- Anchor on dependency_impact_events (active) and integration_health failures
  FOR v_anchor IN
    SELECT
      'dep_'||die.id::text AS source_key,
      die.detected_at AS event_time,
      die.failed_module_code AS module_code,
      die.severity,
      COALESCE(die.failed_module_code,'unknown') AS root_candidate,
      die.id AS source_record_id
    FROM public.dependency_impact_events die
    WHERE die.detected_at >= now() - (p_lookback_hours || ' hours')::interval
      AND die.impact_status = 'active'
    ORDER BY die.detected_at ASC
  LOOP
    -- Check if there's an open incident for this module within the time window
    SELECT id INTO v_existing
    FROM public.system_incidents
    WHERE origin_module_code = v_anchor.module_code
      AND current_status NOT IN ('resolved','resolved_with_degradation')
      AND started_at >= v_anchor.event_time - (p_window_minutes || ' minutes')::interval
    ORDER BY started_at DESC
    LIMIT 1;

    IF v_existing IS NULL THEN
      v_incident_code := 'INC-' || to_char(now(),'YYYYMMDD') || '-' || substr(md5(random()::text),1,6);
      INSERT INTO public.system_incidents (
        incident_code, origin_module_code, current_status, severity,
        title, root_cause_module, started_at
      ) VALUES (
        v_incident_code, v_anchor.module_code, 'open', v_anchor.severity,
        'Falha em ' || v_anchor.module_code,
        v_anchor.root_candidate, v_anchor.event_time
      ) RETURNING id INTO v_incident_id;
      v_created := v_created + 1;
    ELSE
      v_incident_id := v_existing;
    END IF;

    -- Normalize: dependency_impact event
    INSERT INTO public.incident_timeline_events (
      incident_id, event_time, module_code, event_source, event_type,
      event_role, severity, message, source_record_id
    )
    SELECT v_incident_id, v_anchor.event_time, v_anchor.module_code, 'dependency_impact',
           'impact_detected', 'root', v_anchor.severity,
           'Impacto detectado em ' || v_anchor.module_code, v_anchor.source_record_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.incident_timeline_events
      WHERE incident_id = v_incident_id AND source_record_id = v_anchor.source_record_id AND event_source='dependency_impact'
    );
    GET DIAGNOSTICS v_events_added = ROW_COUNT;
  END LOOP;

  -- Pull related events for OPEN incidents from all 6 sources
  FOR v_anchor IN
    SELECT id, origin_module_code, started_at FROM public.system_incidents
    WHERE current_status NOT IN ('resolved','resolved_with_degradation')
      AND started_at >= now() - (p_lookback_hours || ' hours')::interval
  LOOP
    -- integration_health_events
    INSERT INTO public.incident_timeline_events (incident_id, event_time, module_code, event_source, event_type, event_role, severity, message, source_record_id)
    SELECT v_anchor.id, ihe.detected_at, ihe.module_code, 'integration_health',
           ihe.event_type, 'derived',
           CASE WHEN ihe.event_type ILIKE '%fail%' OR ihe.event_type ILIKE '%error%' THEN 'high' ELSE 'moderate' END,
           COALESCE(ihe.message, ihe.event_type), ihe.id
    FROM public.integration_health_events ihe
    WHERE ihe.module_code = v_anchor.origin_module_code
      AND ihe.detected_at BETWEEN v_anchor.started_at - interval '2 minutes' AND v_anchor.started_at + interval '30 minutes'
      AND NOT EXISTS (SELECT 1 FROM public.incident_timeline_events WHERE incident_id=v_anchor.id AND source_record_id=ihe.id AND event_source='integration_health');

    -- automation_execution_logs
    INSERT INTO public.incident_timeline_events (incident_id, event_time, module_code, event_source, event_type, event_role, severity, message, source_record_id)
    SELECT v_anchor.id, ael.created_at, COALESCE(ael.source_table, v_anchor.origin_module_code), 'automation_log',
           ael.event_type, CASE WHEN ael.status='error' THEN 'aggravation' ELSE 'derived' END,
           CASE WHEN ael.status='error' THEN 'high' ELSE 'info' END,
           COALESCE(ael.error_message, ael.rule_name, ael.event_type), ael.id
    FROM public.automation_execution_logs ael
    WHERE COALESCE(ael.source_table,'') = v_anchor.origin_module_code
      AND ael.created_at BETWEEN v_anchor.started_at - interval '2 minutes' AND v_anchor.started_at + interval '30 minutes'
      AND NOT EXISTS (SELECT 1 FROM public.incident_timeline_events WHERE incident_id=v_anchor.id AND source_record_id=ael.id AND event_source='automation_log');

    -- recovery_execution_logs
    INSERT INTO public.incident_timeline_events (incident_id, event_time, module_code, event_source, event_type, event_role, severity, message, source_record_id, actor_type)
    SELECT v_anchor.id, rel.started_at, v_anchor.origin_module_code, 'recovery_log',
           rel.recovery_code,
           CASE WHEN rel.result='success' THEN 'stabilization' WHEN rel.result='failed' THEN 'aggravation' ELSE 'recovery' END,
           CASE WHEN rel.result='success' THEN 'info' WHEN rel.result='failed' THEN 'high' ELSE 'moderate' END,
           'Recovery: ' || rel.recovery_code || ' (' || COALESCE(rel.result,'pending') || ')', rel.id,
           CASE WHEN rel.execution_mode='auto' THEN 'auto' ELSE 'owner' END
    FROM public.recovery_execution_logs rel
    WHERE rel.failure_code ILIKE '%' || v_anchor.origin_module_code || '%'
      AND rel.started_at BETWEEN v_anchor.started_at - interval '2 minutes' AND v_anchor.started_at + interval '2 hours'
      AND NOT EXISTS (SELECT 1 FROM public.incident_timeline_events WHERE incident_id=v_anchor.id AND source_record_id=rel.id AND event_source='recovery_log');

    -- root_cause_analysis_events
    INSERT INTO public.incident_timeline_events (incident_id, event_time, module_code, event_source, event_type, event_role, severity, message, source_record_id, actor_type)
    SELECT v_anchor.id, rca.created_at, COALESCE(rca.root_cause_module, v_anchor.origin_module_code), 'root_cause',
           'rca_completed', 'root', 'high',
           'Causa raiz: ' || COALESCE(rca.root_cause_module,'?') || ' (' || COALESCE(rca.confidence,0) || '%)', rca.id,
           CASE WHEN rca.analysis_method='ai' THEN 'ai' ELSE 'system' END
    FROM public.root_cause_analysis_events rca
    WHERE rca.created_at BETWEEN v_anchor.started_at - interval '2 minutes' AND v_anchor.started_at + interval '2 hours'
      AND (rca.root_cause_module = v_anchor.origin_module_code OR rca.affected_modules @> ARRAY[v_anchor.origin_module_code])
      AND NOT EXISTS (SELECT 1 FROM public.incident_timeline_events WHERE incident_id=v_anchor.id AND source_record_id=rca.id AND event_source='root_cause');

    -- audit_log (only error/critical)
    INSERT INTO public.incident_timeline_events (incident_id, event_time, module_code, event_source, event_type, event_role, severity, message, source_record_id, actor_id, actor_type)
    SELECT v_anchor.id, al.created_at, v_anchor.origin_module_code, 'audit_log',
           al.event_type, 'derived', 'info',
           al.event_type || ' on ' || al.table_name, al.id, al.user_id,
           CASE WHEN al.user_id IS NOT NULL THEN 'admin' ELSE 'system' END
    FROM public.audit_log al
    WHERE al.table_name ILIKE '%' || v_anchor.origin_module_code || '%'
      AND al.created_at BETWEEN v_anchor.started_at - interval '1 minute' AND v_anchor.started_at + interval '30 minutes'
      AND al.event_type IN ('error','recovery','manual_action','status_change')
      AND NOT EXISTS (SELECT 1 FROM public.incident_timeline_events WHERE incident_id=v_anchor.id AND source_record_id=al.id AND event_source='audit_log');

    -- Update aggregates
    UPDATE public.system_incidents si
    SET
      recovery_attempts = (SELECT COUNT(*) FROM public.incident_timeline_events WHERE incident_id=si.id AND event_source='recovery_log'),
      recovery_success_count = (SELECT COUNT(*) FROM public.incident_timeline_events WHERE incident_id=si.id AND event_source='recovery_log' AND event_role='stabilization'),
      impacted_modules = ARRAY(SELECT DISTINCT module_code FROM public.incident_timeline_events WHERE incident_id=si.id),
      severity = COALESCE((SELECT CASE
        WHEN COUNT(*) FILTER (WHERE severity='critical')>0 THEN 'critical'
        WHEN COUNT(*) FILTER (WHERE severity='high')>0 THEN 'high'
        WHEN COUNT(*) FILTER (WHERE severity='moderate')>0 THEN 'moderate'
        ELSE 'low' END FROM public.incident_timeline_events WHERE incident_id=si.id), si.severity)
    WHERE si.id = v_anchor.id;

    -- Auto-resolve if last event >30min and at least one stabilization
    UPDATE public.system_incidents si
    SET current_status = 'resolved', resolved_at = now()
    WHERE si.id = v_anchor.id
      AND si.current_status NOT IN ('resolved','resolved_with_degradation')
      AND EXISTS (SELECT 1 FROM public.incident_timeline_events WHERE incident_id=si.id AND event_role='stabilization')
      AND NOT EXISTS (SELECT 1 FROM public.incident_timeline_events WHERE incident_id=si.id AND event_time > now() - interval '30 minutes');
  END LOOP;

  RETURN jsonb_build_object('incidents_created', v_created, 'completed_at', now());
END;
$$;

-- =====================================================
-- ANALYTICS RPC
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_incident_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v JSONB;
BEGIN
  SELECT jsonb_build_object(
    'open_incidents', (SELECT COUNT(*) FROM public.system_incidents WHERE current_status NOT IN ('resolved','resolved_with_degradation')),
    'critical_7d', (SELECT COUNT(*) FROM public.system_incidents WHERE severity='critical' AND started_at >= now() - interval '7 days'),
    'reopened_7d', (SELECT COUNT(*) FROM public.system_incidents WHERE current_status='reopened' AND started_at >= now() - interval '7 days'),
    'avg_resolution_seconds', (SELECT COALESCE(AVG(duration_seconds),0)::INTEGER FROM public.system_incidents WHERE resolved_at >= now() - interval '30 days'),
    'auto_recovery_pct', (
      SELECT COALESCE(ROUND(100.0 * SUM(CASE WHEN actor_type='auto' THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0))::INTEGER,0)
      FROM public.incident_timeline_events WHERE event_source='recovery_log' AND created_at >= now() - interval '30 days'
    ),
    'cascade_incidents_7d', (SELECT COUNT(*) FROM public.system_incidents WHERE array_length(impacted_modules,1) > 1 AND started_at >= now() - interval '7 days'),
    'by_module', (SELECT COALESCE(jsonb_agg(jsonb_build_object('module', origin_module_code, 'count', c) ORDER BY c DESC),'[]'::jsonb)
                  FROM (SELECT origin_module_code, COUNT(*) c FROM public.system_incidents WHERE started_at >= now() - interval '30 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 10) t),
    'last_analysis_at', now()
  ) INTO v;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_incident_timeline(p_incident_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v JSONB;
BEGIN
  SELECT jsonb_build_object(
    'incident', (SELECT to_jsonb(si) FROM public.system_incidents si WHERE id = p_incident_id),
    'events', (SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY event_time),'[]'::jsonb) FROM public.incident_timeline_events e WHERE incident_id = p_incident_id),
    'status_history', (SELECT COALESCE(jsonb_agg(to_jsonb(h) ORDER BY created_at),'[]'::jsonb) FROM public.incident_status_history h WHERE incident_id = p_incident_id),
    'root_cause', (SELECT to_jsonb(r) FROM public.incident_root_cause_summary r WHERE incident_id = p_incident_id)
  ) INTO v;
  RETURN v;
END;
$$;