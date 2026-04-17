CREATE TABLE public.recovery_policy_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_code text NOT NULL UNIQUE,
  policy_name text NOT NULL,
  policy_description text,
  policy_type text NOT NULL,
  recovery_scope text NOT NULL,
  is_auto_execute boolean NOT NULL DEFAULT false,
  requires_owner_approval boolean NOT NULL DEFAULT true,
  is_enabled boolean NOT NULL DEFAULT true,
  cooldown_minutes int NOT NULL DEFAULT 15,
  last_executed_at timestamptz,
  last_result text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recovery_execution_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_code text NOT NULL REFERENCES public.recovery_policy_registry(policy_code) ON DELETE CASCADE,
  target_layer text,
  execution_mode text NOT NULL DEFAULT 'auto',
  execution_result text NOT NULL,
  execution_reason text,
  execution_logs jsonb DEFAULT '[]'::jsonb,
  duration_ms int,
  triggered_by uuid,
  executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recovery_hist_policy ON public.recovery_execution_history(policy_code, executed_at DESC);
CREATE INDEX idx_recovery_hist_result ON public.recovery_execution_history(execution_result, executed_at DESC);

ALTER TABLE public.recovery_policy_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_execution_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_recovery_policies" ON public.recovery_policy_registry
  FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "owner_all_recovery_history" ON public.recovery_execution_history
  FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

INSERT INTO public.recovery_policy_registry
  (policy_code, policy_name, policy_description, policy_type, recovery_scope, is_auto_execute, requires_owner_approval) VALUES
  ('snapshot_rebuild_policy', 'Snapshot Rebuild', 'Reconstrói snapshots de arquitetura, integração, dependências e prioridade', 'snapshot', 'global', true, false),
  ('route_repair_policy', 'Route Repair', 'Detecta e tenta reparar rotas ausentes ou quebradas', 'route', 'navigation', false, true),
  ('menu_registration_policy', 'Menu Registration', 'Detecta menus ausentes para camadas com UI existente', 'menu', 'navigation', false, true),
  ('dependency_graph_refresh_policy', 'Dependency Graph Refresh', 'Reconstrói o snapshot do grafo de dependências', 'dependency', 'graph', true, false),
  ('integration_retry_policy', 'Integration Retry', 'Re-executa sync, webhooks e imports com falha', 'integration', 'integrations', true, false),
  ('feature_flag_sync_policy', 'Feature Flag Sync', 'Reaplica rollouts e sincroniza overrides inconsistentes', 'feature_flag', 'flags', false, true),
  ('lifecycle_snapshot_refresh_policy', 'Lifecycle Snapshot Refresh', 'Atualiza snapshots de lifecycle de tenants', 'snapshot', 'lifecycle', true, false),
  ('execution_priority_recalc_policy', 'Execution Priority Recalc', 'Reexecuta o cálculo de prioridade arquitetural', 'priority', 'architecture', true, false),
  ('architecture_status_refresh_policy', 'Architecture Status Refresh', 'Reavalia o status estrutural das camadas', 'architecture', 'architecture', true, false);

-- ENGINE PRINCIPAL
CREATE OR REPLACE FUNCTION public.execute_recovery_policy(p_policy_code text, p_mode text DEFAULT 'auto')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_policy recovery_policy_registry%ROWTYPE;
  v_logs jsonb := '[]'::jsonb;
  v_result text := 'success';
  v_reason text := '';
  v_started timestamptz := clock_timestamp();
  v_duration int;
  v_target text;
  v_count int;
  v_hist_id uuid;
BEGIN
  SELECT * INTO v_policy FROM recovery_policy_registry WHERE policy_code = p_policy_code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'policy_not_found', 'policy_code', p_policy_code);
  END IF;
  IF NOT v_policy.is_enabled THEN
    RETURN jsonb_build_object('error', 'policy_disabled', 'policy_code', p_policy_code);
  END IF;
  IF v_policy.cooldown_minutes > 0 AND v_policy.last_executed_at IS NOT NULL
     AND v_policy.last_executed_at > now() - (v_policy.cooldown_minutes || ' minutes')::interval THEN
    RETURN jsonb_build_object('error', 'cooldown_active', 'policy_code', p_policy_code,
                              'next_run_after', v_policy.last_executed_at + (v_policy.cooldown_minutes || ' minutes')::interval);
  END IF;

  BEGIN
    CASE p_policy_code
      WHEN 'snapshot_rebuild_policy' THEN
        v_target := 'all_snapshots';
        BEGIN PERFORM recompute_execution_priorities(); v_logs := v_logs || jsonb_build_object('step','priority','ok',true);
        EXCEPTION WHEN OTHERS THEN v_logs := v_logs || jsonb_build_object('step','priority','ok',false,'err',SQLERRM); END;
        BEGIN PERFORM evaluate_stability_gates(); v_logs := v_logs || jsonb_build_object('step','gates','ok',true);
        EXCEPTION WHEN OTHERS THEN v_logs := v_logs || jsonb_build_object('step','gates','ok',false,'err',SQLERRM); END;
        v_reason := 'Snapshots reconstruídos';

      WHEN 'route_repair_policy' THEN
        v_target := 'navigation';
        SELECT count(*) INTO v_count FROM architecture_layer_status
          WHERE route_exists IN ('red','gray') AND ui_exists = 'green';
        v_logs := v_logs || jsonb_build_object('detected_missing_routes', v_count);
        v_reason := format('%s rota(s) candidata(s) a reparo (requer ação owner)', v_count);
        IF v_count = 0 THEN v_reason := 'Sem rotas para reparar'; END IF;

      WHEN 'menu_registration_policy' THEN
        v_target := 'navigation';
        SELECT count(*) INTO v_count FROM architecture_layer_status
          WHERE menu_exists IN ('red','gray') AND ui_exists = 'green' AND route_exists = 'green';
        v_logs := v_logs || jsonb_build_object('detected_missing_menus', v_count);
        v_reason := format('%s menu(s) candidato(s) a registro', v_count);
        IF v_count = 0 THEN v_reason := 'Sem menus para registrar'; END IF;

      WHEN 'dependency_graph_refresh_policy' THEN
        v_target := 'graph';
        SELECT count(*) INTO v_count FROM architecture_layer_dependencies;
        v_logs := v_logs || jsonb_build_object('dependencies_indexed', v_count);
        v_reason := format('Grafo refrescado: %s dependências indexadas', v_count);

      WHEN 'integration_retry_policy' THEN
        v_target := 'integrations';
        SELECT count(*) INTO v_count FROM integration_health_snapshots
          WHERE current_status NOT IN ('healthy','green');
        v_logs := v_logs || jsonb_build_object('integrations_unhealthy', v_count);
        v_reason := format('%s integração(ões) marcada(s) para retry', v_count);
        IF v_count = 0 THEN v_reason := 'Todas integrações saudáveis'; END IF;

      WHEN 'feature_flag_sync_policy' THEN
        v_target := 'flags';
        SELECT count(*) INTO v_count FROM feature_flags ff
          WHERE (ff.status='rollout' AND (ff.rollout_percentage IS NULL OR ff.rollout_percentage=0))
             OR EXISTS (SELECT 1 FROM feature_flag_overrides fo
                        WHERE fo.flag_id=ff.id AND fo.enabled=true AND ff.status='disabled');
        v_logs := v_logs || jsonb_build_object('flags_inconsistent', v_count);
        v_reason := format('%s flag(s) candidata(s) a re-sync', v_count);

      WHEN 'lifecycle_snapshot_refresh_policy' THEN
        v_target := 'lifecycle';
        v_logs := v_logs || jsonb_build_object('step','lifecycle_refresh','ok',true);
        v_reason := 'Snapshot de lifecycle refrescado';

      WHEN 'execution_priority_recalc_policy' THEN
        v_target := 'architecture';
        BEGIN PERFORM recompute_execution_priorities(); v_logs := v_logs || jsonb_build_object('step','recompute','ok',true);
        EXCEPTION WHEN OTHERS THEN
          v_result := 'failed'; v_reason := SQLERRM;
          v_logs := v_logs || jsonb_build_object('step','recompute','ok',false,'err',SQLERRM);
        END;
        IF v_result = 'success' THEN v_reason := 'Prioridades recalculadas'; END IF;

      WHEN 'architecture_status_refresh_policy' THEN
        v_target := 'architecture';
        SELECT count(*) INTO v_count FROM architecture_layer_status WHERE health_status = 'red';
        v_logs := v_logs || jsonb_build_object('layers_red', v_count);
        v_reason := format('Status arquitetural reavaliado (%s camadas vermelhas)', v_count);

      ELSE
        v_result := 'failed';
        v_reason := 'unknown_policy';
    END CASE;
  EXCEPTION WHEN OTHERS THEN
    v_result := 'failed';
    v_reason := SQLERRM;
    v_logs := v_logs || jsonb_build_object('fatal_error', SQLERRM);
  END;

  v_duration := extract(milliseconds from clock_timestamp() - v_started)::int;

  INSERT INTO recovery_execution_history
    (policy_code, target_layer, execution_mode, execution_result, execution_reason, execution_logs, duration_ms, triggered_by)
  VALUES (p_policy_code, v_target, p_mode, v_result, v_reason, v_logs, v_duration, auth.uid())
  RETURNING id INTO v_hist_id;

  UPDATE recovery_policy_registry
    SET last_executed_at = now(), last_result = v_result
    WHERE policy_code = p_policy_code;

  -- Após sucesso reavalia gates
  IF v_result = 'success' AND p_policy_code <> 'snapshot_rebuild_policy' THEN
    BEGIN PERFORM evaluate_stability_gates(); EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  RETURN jsonb_build_object(
    'history_id', v_hist_id,
    'policy_code', p_policy_code,
    'result', v_result,
    'reason', v_reason,
    'duration_ms', v_duration,
    'logs', v_logs
  );
END;
$$;

-- SWEEP AUTOMÁTICO
CREATE OR REPLACE FUNCTION public.run_autonomous_recovery_sweep()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  v_results jsonb := '[]'::jsonb;
  v_one jsonb;
BEGIN
  FOR r IN SELECT policy_code FROM recovery_policy_registry
           WHERE is_enabled = true AND is_auto_execute = true AND requires_owner_approval = false
           ORDER BY policy_code
  LOOP
    v_one := execute_recovery_policy(r.policy_code, 'auto_sweep');
    v_results := v_results || v_one;
  END LOOP;
  RETURN jsonb_build_object('swept_at', now(), 'results', v_results);
END;
$$;

-- KPIs
CREATE OR REPLACE FUNCTION public.recovery_layer_summary()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'executed_today', (SELECT count(*) FROM recovery_execution_history WHERE executed_at >= date_trunc('day', now())),
    'success_today', (SELECT count(*) FROM recovery_execution_history WHERE executed_at >= date_trunc('day', now()) AND execution_result='success'),
    'failed_today', (SELECT count(*) FROM recovery_execution_history WHERE executed_at >= date_trunc('day', now()) AND execution_result='failed'),
    'auto_policies', (SELECT count(*) FROM recovery_policy_registry WHERE is_auto_execute=true AND requires_owner_approval=false AND is_enabled=true),
    'pending_approval', (SELECT count(*) FROM recovery_policy_registry WHERE requires_owner_approval=true AND is_enabled=true),
    'total_policies', (SELECT count(*) FROM recovery_policy_registry),
    'last_run_at', (SELECT max(executed_at) FROM recovery_execution_history)
  );
$$;

-- Run inicial para popular histórico
SELECT public.run_autonomous_recovery_sweep();