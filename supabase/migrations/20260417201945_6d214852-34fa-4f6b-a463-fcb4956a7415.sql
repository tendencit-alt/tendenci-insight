CREATE TABLE public.stability_gate_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_code text NOT NULL UNIQUE,
  gate_name text NOT NULL,
  gate_description text,
  gate_type text NOT NULL,
  gate_status text NOT NULL DEFAULT 'green',
  is_blocking boolean NOT NULL DEFAULT false,
  last_reason text,
  last_blocking_count int NOT NULL DEFAULT 0,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.stability_gate_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_code text NOT NULL REFERENCES public.stability_gate_registry(gate_code) ON DELETE CASCADE,
  evaluation_result text NOT NULL,
  evaluation_reason text,
  blocking_detected boolean NOT NULL DEFAULT false,
  blocking_count int NOT NULL DEFAULT 0,
  related_layer text,
  related_release text,
  details jsonb DEFAULT '{}'::jsonb,
  evaluated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stab_eval_gate ON public.stability_gate_evaluations(gate_code, evaluated_at DESC);
CREATE INDEX idx_stab_eval_blocking ON public.stability_gate_evaluations(blocking_detected) WHERE blocking_detected = true;

ALTER TABLE public.stability_gate_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stability_gate_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_stability_registry" ON public.stability_gate_registry
  FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "owner_all_stability_evaluations" ON public.stability_gate_evaluations
  FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

INSERT INTO public.stability_gate_registry (gate_code, gate_name, gate_description, gate_type) VALUES
  ('integration_health_gate', 'Integration Health', 'Bloqueia mudanças quando integrações entre módulos não estão saudáveis', 'health'),
  ('dependency_integrity_gate', 'Dependency Integrity', 'Bloqueia quando dependências críticas estão em cascata ou impactadas', 'dependency'),
  ('incident_state_gate', 'Incident State', 'Bloqueia enquanto houver incidentes críticos ativos', 'incident'),
  ('architecture_completeness_gate', 'Architecture Completeness', 'Bloqueia quando camadas críticas não têm UI/backend/rota/menu', 'architecture'),
  ('release_safety_gate', 'Release Safety', 'Bloqueia releases parciais ou rollouts incompletos', 'release'),
  ('entitlement_consistency_gate', 'Entitlement Consistency', 'Bloqueia entitlements inconsistentes ou expirados ainda ativos', 'entitlement'),
  ('feature_flag_safety_gate', 'Feature Flag Safety', 'Bloqueia rollouts de flags em estado inconsistente ou conflitante', 'feature_flag');

CREATE OR REPLACE FUNCTION public.evaluate_stability_gates()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int; v_status text; v_reason text; v_blocking boolean;
  v_results jsonb := '[]'::jsonb;
BEGIN
  -- 1. INTEGRATION HEALTH GATE
  SELECT count(*) INTO v_count FROM integration_health_snapshots
    WHERE current_status NOT IN ('healthy','green');
  v_blocking := v_count > 0;
  v_status := CASE WHEN v_count=0 THEN 'green' WHEN v_count<=2 THEN 'yellow' ELSE 'red' END;
  v_reason := CASE WHEN v_count=0 THEN 'Todas integrações saudáveis'
                   ELSE format('%s integração(ões) não-saudável(eis)', v_count) END;
  INSERT INTO stability_gate_evaluations (gate_code, evaluation_result, evaluation_reason, blocking_detected, blocking_count)
    VALUES ('integration_health_gate', v_status, v_reason, v_blocking, v_count);
  UPDATE stability_gate_registry SET gate_status=v_status, is_blocking=v_blocking, last_reason=v_reason,
    last_blocking_count=v_count, last_checked_at=now() WHERE gate_code='integration_health_gate';
  v_results := v_results || jsonb_build_object('gate','integration_health_gate','status',v_status,'blocking',v_blocking,'count',v_count);

  -- 2. DEPENDENCY INTEGRITY GATE (impact_level high/critical em cascade)
  SELECT count(*) INTO v_count FROM dependency_impact_events
    WHERE impact_status='active' AND impact_level IN ('high','critical');
  v_blocking := v_count > 0;
  v_status := CASE WHEN v_count=0 THEN 'green' WHEN v_count<=2 THEN 'yellow' ELSE 'red' END;
  v_reason := CASE WHEN v_count=0 THEN 'Sem cascatas críticas ativas'
                   ELSE format('%s impacto(s) em cascata ativos', v_count) END;
  INSERT INTO stability_gate_evaluations (gate_code, evaluation_result, evaluation_reason, blocking_detected, blocking_count)
    VALUES ('dependency_integrity_gate', v_status, v_reason, v_blocking, v_count);
  UPDATE stability_gate_registry SET gate_status=v_status, is_blocking=v_blocking, last_reason=v_reason,
    last_blocking_count=v_count, last_checked_at=now() WHERE gate_code='dependency_integrity_gate';
  v_results := v_results || jsonb_build_object('gate','dependency_integrity_gate','status',v_status,'blocking',v_blocking,'count',v_count);

  -- 3. INCIDENT STATE GATE
  SELECT count(*) INTO v_count FROM system_incidents
    WHERE current_status NOT IN ('resolved','closed','cancelled') AND severity='critical';
  v_blocking := v_count > 0;
  v_status := CASE WHEN v_count=0 THEN 'green' ELSE 'red' END;
  v_reason := CASE WHEN v_count=0 THEN 'Sem incidentes críticos ativos'
                   ELSE format('%s incidente(s) crítico(s) não resolvido(s)', v_count) END;
  INSERT INTO stability_gate_evaluations (gate_code, evaluation_result, evaluation_reason, blocking_detected, blocking_count)
    VALUES ('incident_state_gate', v_status, v_reason, v_blocking, v_count);
  UPDATE stability_gate_registry SET gate_status=v_status, is_blocking=v_blocking, last_reason=v_reason,
    last_blocking_count=v_count, last_checked_at=now() WHERE gate_code='incident_state_gate';
  v_results := v_results || jsonb_build_object('gate','incident_state_gate','status',v_status,'blocking',v_blocking,'count',v_count);

  -- 4. ARCHITECTURE COMPLETENESS GATE
  SELECT count(*) INTO v_count FROM execution_priority_registry epr
    JOIN architecture_layer_status als ON als.layer_code = epr.layer_code
    WHERE epr.priority_level IN ('critical','high')
      AND (als.ui_exists IN ('red','gray') OR als.backend_exists IN ('red','gray')
           OR als.route_exists IN ('red','gray') OR als.menu_exists IN ('red','gray'));
  v_blocking := v_count > 0;
  v_status := CASE WHEN v_count=0 THEN 'green' WHEN v_count<=2 THEN 'yellow' ELSE 'red' END;
  v_reason := CASE WHEN v_count=0 THEN 'Camadas críticas completas'
                   ELSE format('%s camada(s) crítica(s) incompleta(s)', v_count) END;
  INSERT INTO stability_gate_evaluations (gate_code, evaluation_result, evaluation_reason, blocking_detected, blocking_count)
    VALUES ('architecture_completeness_gate', v_status, v_reason, v_blocking, v_count);
  UPDATE stability_gate_registry SET gate_status=v_status, is_blocking=v_blocking, last_reason=v_reason,
    last_blocking_count=v_count, last_checked_at=now() WHERE gate_code='architecture_completeness_gate';
  v_results := v_results || jsonb_build_object('gate','architecture_completeness_gate','status',v_status,'blocking',v_blocking,'count',v_count);

  -- 5. RELEASE SAFETY GATE (rollouts parados parcialmente > 7 dias)
  SELECT count(*) INTO v_count FROM feature_flags
    WHERE status='rollout' AND rollout_percentage > 0 AND rollout_percentage < 100
      AND updated_at < now() - interval '7 days';
  v_blocking := v_count > 0;
  v_status := CASE WHEN v_count=0 THEN 'green' WHEN v_count<=3 THEN 'yellow' ELSE 'red' END;
  v_reason := CASE WHEN v_count=0 THEN 'Sem releases travados em rollout parcial'
                   ELSE format('%s release(s) parados em rollout parcial > 7d', v_count) END;
  INSERT INTO stability_gate_evaluations (gate_code, evaluation_result, evaluation_reason, blocking_detected, blocking_count)
    VALUES ('release_safety_gate', v_status, v_reason, v_blocking, v_count);
  UPDATE stability_gate_registry SET gate_status=v_status, is_blocking=v_blocking, last_reason=v_reason,
    last_blocking_count=v_count, last_checked_at=now() WHERE gate_code='release_safety_gate';
  v_results := v_results || jsonb_build_object('gate','release_safety_gate','status',v_status,'blocking',v_blocking,'count',v_count);

  -- 6. ENTITLEMENT CONSISTENCY GATE
  SELECT count(*) INTO v_count FROM tenant_entitlement_grants
    WHERE status='active'
      AND ((expires_at IS NOT NULL AND expires_at < now()) OR entitlement_code IS NULL);
  v_blocking := v_count > 0;
  v_status := CASE WHEN v_count=0 THEN 'green' WHEN v_count<=5 THEN 'yellow' ELSE 'red' END;
  v_reason := CASE WHEN v_count=0 THEN 'Entitlements consistentes'
                   ELSE format('%s entitlement(s) inconsistente(s)', v_count) END;
  INSERT INTO stability_gate_evaluations (gate_code, evaluation_result, evaluation_reason, blocking_detected, blocking_count)
    VALUES ('entitlement_consistency_gate', v_status, v_reason, v_blocking, v_count);
  UPDATE stability_gate_registry SET gate_status=v_status, is_blocking=v_blocking, last_reason=v_reason,
    last_blocking_count=v_count, last_checked_at=now() WHERE gate_code='entitlement_consistency_gate';
  v_results := v_results || jsonb_build_object('gate','entitlement_consistency_gate','status',v_status,'blocking',v_blocking,'count',v_count);

  -- 7. FEATURE FLAG SAFETY GATE
  SELECT count(*) INTO v_count FROM feature_flags ff
    WHERE (ff.status='rollout' AND (ff.rollout_percentage IS NULL OR ff.rollout_percentage=0))
       OR EXISTS (
         SELECT 1 FROM feature_flag_overrides fo
         WHERE fo.flag_id=ff.id AND fo.enabled=true AND ff.status='disabled'
       );
  v_blocking := v_count > 0;
  v_status := CASE WHEN v_count=0 THEN 'green' WHEN v_count<=2 THEN 'yellow' ELSE 'red' END;
  v_reason := CASE WHEN v_count=0 THEN 'Feature flags consistentes'
                   ELSE format('%s flag(s) com configuração conflitante', v_count) END;
  INSERT INTO stability_gate_evaluations (gate_code, evaluation_result, evaluation_reason, blocking_detected, blocking_count)
    VALUES ('feature_flag_safety_gate', v_status, v_reason, v_blocking, v_count);
  UPDATE stability_gate_registry SET gate_status=v_status, is_blocking=v_blocking, last_reason=v_reason,
    last_blocking_count=v_count, last_checked_at=now() WHERE gate_code='feature_flag_safety_gate';
  v_results := v_results || jsonb_build_object('gate','feature_flag_safety_gate','status',v_status,'blocking',v_blocking,'count',v_count);

  RETURN jsonb_build_object('evaluated_at', now(), 'gates', v_results);
END;
$$;

CREATE OR REPLACE FUNCTION public.stability_gates_summary()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM stability_gate_registry),
    'green', (SELECT count(*) FROM stability_gate_registry WHERE gate_status='green'),
    'yellow', (SELECT count(*) FROM stability_gate_registry WHERE gate_status='yellow'),
    'red', (SELECT count(*) FROM stability_gate_registry WHERE gate_status='red'),
    'blocking', (SELECT count(*) FROM stability_gate_registry WHERE is_blocking=true),
    'last_evaluated_at', (SELECT max(last_checked_at) FROM stability_gate_registry),
    'can_release', NOT EXISTS (SELECT 1 FROM stability_gate_registry WHERE is_blocking=true)
  );
$$;

CREATE OR REPLACE FUNCTION public.stability_can_release(p_release_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_blocking jsonb;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'gate_code', gate_code, 'gate_name', gate_name,
    'reason', last_reason, 'count', last_blocking_count
  )) INTO v_blocking FROM stability_gate_registry WHERE is_blocking=true;
  RETURN jsonb_build_object(
    'can_release', v_blocking IS NULL,
    'release_id', p_release_id,
    'blocking_gates', COALESCE(v_blocking, '[]'::jsonb),
    'evaluated_at', now()
  );
END;
$$;

SELECT public.evaluate_stability_gates();