-- ============================================================
-- DEPENDENCY IMPACT LAYER
-- ============================================================

CREATE TABLE public.system_module_dependencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_module_code TEXT NOT NULL,
  dependent_module_code TEXT NOT NULL,
  dependency_strength TEXT NOT NULL DEFAULT 'strong' CHECK (dependency_strength IN ('strong','weak')),
  dependency_type TEXT NOT NULL DEFAULT 'data' CHECK (dependency_type IN ('data','event','config','auth','runtime')),
  is_critical BOOLEAN NOT NULL DEFAULT false,
  degradation_mode TEXT DEFAULT 'partial' CHECK (degradation_mode IN ('full','partial','degraded','silent')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_module_code, dependent_module_code)
);
CREATE INDEX idx_smd_source ON public.system_module_dependencies(source_module_code);
CREATE INDEX idx_smd_dependent ON public.system_module_dependencies(dependent_module_code);

CREATE TABLE public.dependency_impact_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_module_code TEXT NOT NULL,
  target_module_code TEXT NOT NULL,
  impact_level TEXT NOT NULL DEFAULT 'moderate' CHECK (impact_level IN ('low','moderate','high','critical')),
  propagation_depth INT NOT NULL DEFAULT 1,
  condition_type TEXT NOT NULL DEFAULT 'failure' CHECK (condition_type IN ('failure','degradation','latency','timeout','error_rate')),
  threshold JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dir_source ON public.dependency_impact_rules(source_module_code);

CREATE TABLE public.dependency_impact_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_group_id UUID,
  failed_module_code TEXT NOT NULL,
  impacted_module_code TEXT NOT NULL,
  impact_status TEXT NOT NULL DEFAULT 'active' CHECK (impact_status IN ('active','resolved','suppressed')),
  impact_level TEXT NOT NULL DEFAULT 'moderate' CHECK (impact_level IN ('low','moderate','high','critical')),
  root_cause_candidate BOOLEAN NOT NULL DEFAULT false,
  cascade_depth INT NOT NULL DEFAULT 1,
  source_event_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_die_group ON public.dependency_impact_events(incident_group_id);
CREATE INDEX idx_die_failed ON public.dependency_impact_events(failed_module_code);
CREATE INDEX idx_die_impacted ON public.dependency_impact_events(impacted_module_code);
CREATE INDEX idx_die_status ON public.dependency_impact_events(impact_status) WHERE impact_status = 'active';

CREATE TABLE public.root_cause_analysis_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_group_id UUID NOT NULL,
  root_cause_module_code TEXT NOT NULL,
  confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  derived_from TEXT NOT NULL DEFAULT 'sql_heuristic' CHECK (derived_from IN ('sql_heuristic','ai_analysis','manual','hybrid')),
  affected_modules TEXT[] DEFAULT ARRAY[]::TEXT[],
  reasoning TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rca_group ON public.root_cause_analysis_events(incident_group_id);
CREATE INDEX idx_rca_module ON public.root_cause_analysis_events(root_cause_module_code);

CREATE TABLE public.dependency_impact_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_code TEXT NOT NULL UNIQUE,
  impacted_by_count INT NOT NULL DEFAULT 0,
  causing_count INT NOT NULL DEFAULT 0,
  cascade_depth_max INT NOT NULL DEFAULT 0,
  current_impact_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  severity_class TEXT NOT NULL DEFAULT 'low' CHECK (severity_class IN ('low','moderate','high','critical')),
  is_root_cause_active BOOLEAN NOT NULL DEFAULT false,
  active_incidents INT NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dis_severity ON public.dependency_impact_snapshots(severity_class);

-- RLS
ALTER TABLE public.system_module_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependency_impact_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependency_impact_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.root_cause_analysis_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependency_impact_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner/admin manage dependencies" ON public.system_module_dependencies
  FOR ALL USING (public.is_owner() OR public.is_admin()) WITH CHECK (public.is_owner() OR public.is_admin());

CREATE POLICY "Owner/admin manage impact rules" ON public.dependency_impact_rules
  FOR ALL USING (public.is_owner() OR public.is_admin()) WITH CHECK (public.is_owner() OR public.is_admin());

CREATE POLICY "Owner/admin read impact events" ON public.dependency_impact_events
  FOR SELECT USING (public.is_owner() OR public.is_admin());
CREATE POLICY "System inserts impact events" ON public.dependency_impact_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Owner/admin update impact events" ON public.dependency_impact_events
  FOR UPDATE USING (public.is_owner() OR public.is_admin());

CREATE POLICY "Owner/admin read RCA" ON public.root_cause_analysis_events
  FOR SELECT USING (public.is_owner() OR public.is_admin());
CREATE POLICY "System inserts RCA" ON public.root_cause_analysis_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owner/admin read snapshots" ON public.dependency_impact_snapshots
  FOR SELECT USING (public.is_owner() OR public.is_admin());
CREATE POLICY "System manages snapshots" ON public.dependency_impact_snapshots
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- REFRESH SNAPSHOTS
-- ============================================================
CREATE OR REPLACE FUNCTION public.refresh_dependency_impact_snapshots()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH module_stats AS (
    SELECT
      sm.code AS module_code,
      COALESCE((SELECT COUNT(*)::int FROM dependency_impact_events
                WHERE impacted_module_code = sm.code AND impact_status = 'active'), 0) AS impacted_by,
      COALESCE((SELECT COUNT(*)::int FROM dependency_impact_events
                WHERE failed_module_code = sm.code AND impact_status = 'active'), 0) AS causing,
      COALESCE((SELECT MAX(cascade_depth) FROM dependency_impact_events
                WHERE failed_module_code = sm.code AND impact_status = 'active'), 0) AS depth_max,
      COALESCE((SELECT MAX(CASE impact_level WHEN 'critical' THEN 100 WHEN 'high' THEN 70 WHEN 'moderate' THEN 40 ELSE 20 END)
                FROM dependency_impact_events
                WHERE (failed_module_code = sm.code OR impacted_module_code = sm.code)
                  AND impact_status = 'active'), 0) AS max_level_score,
      EXISTS (SELECT 1 FROM dependency_impact_events
              WHERE failed_module_code = sm.code AND root_cause_candidate = true AND impact_status = 'active') AS is_root
    FROM system_modules sm
    WHERE sm.is_active = true
  )
  INSERT INTO dependency_impact_snapshots (
    module_code, impacted_by_count, causing_count, cascade_depth_max,
    current_impact_score, severity_class, is_root_cause_active, active_incidents, updated_at
  )
  SELECT
    module_code, impacted_by, causing, depth_max,
    LEAST(100, max_level_score + (causing * 5) + (impacted_by * 3)),
    CASE
      WHEN max_level_score >= 100 OR causing >= 5 THEN 'critical'
      WHEN max_level_score >= 70 OR causing >= 3 THEN 'high'
      WHEN max_level_score >= 40 OR causing >= 1 OR impacted_by >= 1 THEN 'moderate'
      ELSE 'low'
    END,
    is_root, impacted_by + causing, now()
  FROM module_stats
  ON CONFLICT (module_code) DO UPDATE SET
    impacted_by_count = EXCLUDED.impacted_by_count,
    causing_count = EXCLUDED.causing_count,
    cascade_depth_max = EXCLUDED.cascade_depth_max,
    current_impact_score = EXCLUDED.current_impact_score,
    severity_class = EXCLUDED.severity_class,
    is_root_cause_active = EXCLUDED.is_root_cause_active,
    active_incidents = EXCLUDED.active_incidents,
    updated_at = now();
END;
$$;

-- ============================================================
-- ANALYZE DEPENDENCY IMPACT
-- ============================================================
CREATE OR REPLACE FUNCTION public.analyze_dependency_impact()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_failed_modules TEXT[];
  v_module TEXT;
  v_dependent RECORD;
  v_incident_group UUID := gen_random_uuid();
  v_events_created INT := 0;
  v_root_cause TEXT;
  v_max_fanout INT := 0;
  v_fanout INT;
  v_confidence NUMERIC(5,2);
BEGIN
  SELECT COALESCE(array_agg(DISTINCT source_module_code), ARRAY[]::TEXT[])
  INTO v_failed_modules
  FROM integration_health_snapshots
  WHERE current_status = 'red'
    AND (last_error_at IS NULL OR last_error_at >= now() - interval '1 hour');

  v_failed_modules := v_failed_modules || COALESCE(
    (SELECT array_agg(DISTINCT ar.event_module)
     FROM automation_rules ar
     JOIN automation_execution_logs ael ON ael.rule_id = ar.id
     WHERE ael.status = 'failed' AND ael.created_at >= now() - interval '15 minutes'),
    ARRAY[]::TEXT[]
  );

  IF array_length(v_failed_modules, 1) IS NULL OR array_length(v_failed_modules, 1) = 0 THEN
    UPDATE dependency_impact_events
    SET impact_status = 'resolved', resolved_at = now()
    WHERE impact_status = 'active' AND detected_at < now() - interval '30 minutes';
    PERFORM refresh_dependency_impact_snapshots();
    RETURN jsonb_build_object('failed_modules', 0, 'events_created', 0);
  END IF;

  SELECT array_agg(DISTINCT m) INTO v_failed_modules FROM unnest(v_failed_modules) m WHERE m IS NOT NULL;

  FOREACH v_module IN ARRAY v_failed_modules LOOP
    FOR v_dependent IN
      SELECT smd.dependent_module_code, smd.dependency_strength, smd.is_critical,
             COALESCE(dir.impact_level,
               CASE WHEN smd.is_critical THEN 'critical'
                    WHEN smd.dependency_strength = 'strong' THEN 'high'
                    ELSE 'moderate' END) AS impact_level,
             COALESCE(dir.propagation_depth, 1) AS depth
      FROM system_module_dependencies smd
      LEFT JOIN dependency_impact_rules dir
        ON dir.source_module_code = smd.source_module_code
       AND dir.target_module_code = smd.dependent_module_code
       AND dir.active = true
      WHERE smd.source_module_code = v_module
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM dependency_impact_events
        WHERE failed_module_code = v_module
          AND impacted_module_code = v_dependent.dependent_module_code
          AND impact_status = 'active'
          AND detected_at >= now() - interval '30 minutes'
      ) THEN
        INSERT INTO dependency_impact_events (
          incident_group_id, failed_module_code, impacted_module_code,
          impact_level, cascade_depth, source_event_type, metadata
        ) VALUES (
          v_incident_group, v_module, v_dependent.dependent_module_code,
          v_dependent.impact_level, v_dependent.depth, 'integration_health_red',
          jsonb_build_object('strength', v_dependent.dependency_strength, 'critical', v_dependent.is_critical)
        );
        v_events_created := v_events_created + 1;
      END IF;
    END LOOP;
  END LOOP;

  IF v_events_created > 0 THEN
    FOREACH v_module IN ARRAY v_failed_modules LOOP
      SELECT COUNT(*)::int INTO v_fanout
      FROM dependency_impact_events
      WHERE failed_module_code = v_module AND incident_group_id = v_incident_group;
      IF v_fanout > v_max_fanout THEN
        v_max_fanout := v_fanout;
        v_root_cause := v_module;
      END IF;
    END LOOP;

    IF v_root_cause IS NOT NULL THEN
      v_confidence := LEAST(95, 40 + (v_max_fanout * 10));
      INSERT INTO root_cause_analysis_events (
        incident_group_id, root_cause_module_code, confidence_score,
        derived_from, affected_modules, reasoning
      ) VALUES (
        v_incident_group, v_root_cause, v_confidence, 'sql_heuristic', v_failed_modules,
        format('Módulo com maior fan-out de dependentes impactados (%s) entre %s módulos falhos.',
               v_max_fanout, array_length(v_failed_modules, 1))
      );
      UPDATE dependency_impact_events
      SET root_cause_candidate = true
      WHERE failed_module_code = v_root_cause AND incident_group_id = v_incident_group;
    END IF;
  END IF;

  UPDATE dependency_impact_events
  SET impact_status = 'resolved', resolved_at = now()
  WHERE impact_status = 'active'
    AND detected_at < now() - interval '30 minutes'
    AND failed_module_code != ALL(v_failed_modules);

  PERFORM refresh_dependency_impact_snapshots();

  RETURN jsonb_build_object(
    'incident_group_id', v_incident_group,
    'failed_modules', array_length(v_failed_modules, 1),
    'events_created', v_events_created,
    'root_cause', v_root_cause,
    'confidence', v_confidence
  );
END;
$$;

-- ============================================================
-- OVERVIEW
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dependency_impact_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_cascades INT;
  v_impacted_modules INT;
  v_root_cause_module TEXT;
  v_root_cause_confidence NUMERIC;
  v_avg_severity TEXT;
  v_critical_count INT;
  v_high_count INT;
BEGIN
  SELECT COUNT(DISTINCT incident_group_id)::int INTO v_active_cascades
  FROM dependency_impact_events WHERE impact_status = 'active';

  SELECT COUNT(DISTINCT impacted_module_code)::int INTO v_impacted_modules
  FROM dependency_impact_events WHERE impact_status = 'active';

  SELECT root_cause_module_code, confidence_score
  INTO v_root_cause_module, v_root_cause_confidence
  FROM root_cause_analysis_events
  WHERE created_at >= now() - interval '1 hour'
  ORDER BY created_at DESC, confidence_score DESC
  LIMIT 1;

  SELECT COUNT(*) FILTER (WHERE severity_class = 'critical')::int,
         COUNT(*) FILTER (WHERE severity_class = 'high')::int
  INTO v_critical_count, v_high_count
  FROM dependency_impact_snapshots WHERE active_incidents > 0;

  v_avg_severity := CASE
    WHEN v_critical_count > 0 THEN 'critical'
    WHEN v_high_count > 0 THEN 'high'
    WHEN v_impacted_modules > 0 THEN 'moderate'
    ELSE 'low'
  END;

  RETURN jsonb_build_object(
    'active_cascades', COALESCE(v_active_cascades, 0),
    'impacted_modules', COALESCE(v_impacted_modules, 0),
    'root_cause_module', v_root_cause_module,
    'root_cause_confidence', COALESCE(v_root_cause_confidence, 0),
    'avg_severity', v_avg_severity,
    'critical_count', COALESCE(v_critical_count, 0),
    'high_count', COALESCE(v_high_count, 0),
    'last_analysis_at', now()
  );
END;
$$;

-- ============================================================
-- DEPENDENCY TREE
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_module_dependency_tree(p_module_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level1 JSONB;
  v_level2 JSONB;
  v_depends_on JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'code', dependent_module_code, 'strength', dependency_strength,
    'critical', is_critical, 'type', dependency_type)), '[]'::jsonb)
  INTO v_level1
  FROM system_module_dependencies WHERE source_module_code = p_module_code;

  SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object('code', smd2.dependent_module_code)), '[]'::jsonb)
  INTO v_level2
  FROM system_module_dependencies smd1
  JOIN system_module_dependencies smd2 ON smd2.source_module_code = smd1.dependent_module_code
  WHERE smd1.source_module_code = p_module_code
    AND smd2.dependent_module_code != p_module_code;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'code', source_module_code, 'strength', dependency_strength, 'critical', is_critical)), '[]'::jsonb)
  INTO v_depends_on
  FROM system_module_dependencies WHERE dependent_module_code = p_module_code;

  RETURN jsonb_build_object(
    'module', p_module_code,
    'depends_on', v_depends_on,
    'level_1_impacts', v_level1,
    'level_2_impacts', v_level2
  );
END;
$$;

-- ============================================================
-- SEED
-- ============================================================
INSERT INTO public.system_module_dependencies (source_module_code, dependent_module_code, dependency_strength, dependency_type, is_critical, degradation_mode, description) VALUES
  ('billing', 'entitlements', 'strong', 'data', true, 'full', 'Billing define plano ativo que governa entitlements'),
  ('billing', 'control_tower', 'strong', 'data', true, 'partial', 'Control Tower consome MRR e status financeiro'),
  ('lifecycle', 'control_tower', 'strong', 'event', true, 'partial', 'Lifecycle alimenta health/churn'),
  ('lifecycle', 'health_score', 'strong', 'event', true, 'full', 'Health Score depende de eventos de ciclo de vida'),
  ('crm', 'forecast', 'strong', 'data', true, 'full', 'Forecast usa pipeline do CRM'),
  ('crm', 'projetos', 'strong', 'data', false, 'partial', 'Projetos nasce do CRM ganho'),
  ('projetos', 'producao', 'strong', 'event', true, 'full', 'OPs nascem dos projetos aprovados'),
  ('producao', 'estoque', 'strong', 'event', true, 'full', 'Consumo de matéria-prima'),
  ('estoque', 'suprimentos', 'strong', 'data', false, 'partial', 'Suprimentos é alimentado por baixa de estoque'),
  ('financeiro', 'dre', 'strong', 'data', true, 'full', 'DRE consolida lançamentos do financeiro'),
  ('financeiro', 'fluxo_caixa', 'strong', 'data', true, 'full', 'Fluxo de caixa usa lançamentos'),
  ('automations', 'observability', 'weak', 'event', false, 'silent', 'Logs de execução'),
  ('feature_flags', 'control_tower', 'weak', 'config', false, 'silent', 'Flags afetam UX'),
  ('owner_admin', 'observability', 'weak', 'event', false, 'silent', 'Auditoria de ações Owner')
ON CONFLICT (source_module_code, dependent_module_code) DO NOTHING;

INSERT INTO public.dependency_impact_rules (source_module_code, target_module_code, impact_level, propagation_depth, condition_type) VALUES
  ('billing', 'entitlements', 'critical', 1, 'failure'),
  ('billing', 'control_tower', 'high', 2, 'failure'),
  ('lifecycle', 'health_score', 'critical', 1, 'failure'),
  ('lifecycle', 'control_tower', 'high', 2, 'failure'),
  ('crm', 'forecast', 'high', 1, 'failure'),
  ('financeiro', 'dre', 'critical', 1, 'failure'),
  ('financeiro', 'fluxo_caixa', 'critical', 1, 'failure'),
  ('producao', 'estoque', 'high', 1, 'failure');