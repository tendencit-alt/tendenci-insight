CREATE TABLE public.execution_priority_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_code text NOT NULL UNIQUE REFERENCES public.architecture_layers_registry(code) ON DELETE CASCADE,
  impact_score numeric NOT NULL DEFAULT 0,
  dependency_score numeric NOT NULL DEFAULT 0,
  incident_score numeric NOT NULL DEFAULT 0,
  visibility_score numeric NOT NULL DEFAULT 0,
  integration_score numeric NOT NULL DEFAULT 0,
  completion_score numeric NOT NULL DEFAULT 0,
  execution_priority_index numeric NOT NULL DEFAULT 0,
  priority_level text NOT NULL DEFAULT 'low',
  priority_reason text,
  dependency_count int NOT NULL DEFAULT 0,
  impacted_count int NOT NULL DEFAULT 0,
  incident_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_exec_priority_level ON public.execution_priority_registry(priority_level);
CREATE INDEX idx_exec_priority_index ON public.execution_priority_registry(execution_priority_index DESC);

ALTER TABLE public.execution_priority_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_exec_priority" ON public.execution_priority_registry
  FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE OR REPLACE FUNCTION public.recompute_execution_priorities()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_layer record;
  v_dep_out int; v_dep_in int; v_dep_critical int; v_incidents int;
  v_status record;
  v_impact numeric; v_dep_score numeric; v_inc_score numeric;
  v_vis_score numeric; v_int_score numeric; v_comp_score numeric;
  v_index numeric; v_level text; v_reason text;
  v_count int := 0;
BEGIN
  FOR v_layer IN SELECT code, name, "group", owner_area FROM architecture_layers_registry LOOP
    SELECT count(*) INTO v_dep_out FROM architecture_layer_dependencies WHERE layer_code = v_layer.code;
    SELECT count(*) INTO v_dep_in FROM architecture_layer_dependencies WHERE depends_on_layer_code = v_layer.code;
    SELECT count(*) INTO v_dep_critical FROM architecture_layer_dependencies
      WHERE depends_on_layer_code = v_layer.code AND is_critical = true;

    -- Incidentes ativos: heurística por origin_module_code OU presença em impacted_modules
    SELECT count(*) INTO v_incidents FROM system_incidents
      WHERE current_status NOT IN ('resolved','closed','cancelled')
        AND (origin_module_code ILIKE '%' || v_layer.code || '%'
             OR root_cause_module ILIKE '%' || v_layer.code || '%'
             OR impacted_modules::text ILIKE '%' || v_layer.code || '%');

    SELECT * INTO v_status FROM architecture_layer_status WHERE layer_code = v_layer.code;

    v_impact := LEAST(100, v_dep_in * 15 + v_dep_critical * 10);
    v_dep_score := LEAST(100, v_dep_out * 12);
    v_inc_score := LEAST(100, v_incidents * 25);

    v_vis_score := CASE
      WHEN v_status.menu_exists IN ('red','gray') OR v_status.route_exists IN ('red','gray') THEN 80
      WHEN v_status.menu_exists = 'yellow' OR v_status.route_exists = 'yellow' THEN 40
      ELSE 0
    END;

    v_int_score := CASE v_status.integration_connected
      WHEN 'red' THEN 100 WHEN 'gray' THEN 80 WHEN 'yellow' THEN 50 ELSE 0
    END;

    v_comp_score := 0;
    IF v_status.ui_exists IN ('red','gray') THEN v_comp_score := v_comp_score + 35; END IF;
    IF v_status.backend_exists IN ('red','gray') THEN v_comp_score := v_comp_score + 35; END IF;
    IF v_status.data_connected IN ('red','gray') THEN v_comp_score := v_comp_score + 30; END IF;
    IF v_status.ui_exists = 'yellow' THEN v_comp_score := v_comp_score + 15; END IF;
    IF v_status.backend_exists = 'yellow' THEN v_comp_score := v_comp_score + 15; END IF;
    IF v_status.data_connected = 'yellow' THEN v_comp_score := v_comp_score + 10; END IF;
    v_comp_score := LEAST(100, v_comp_score);

    v_index := round(
      v_impact * 0.30 + v_dep_score * 0.25 + v_inc_score * 0.20 +
      v_int_score * 0.15 + v_comp_score * 0.10
    , 2);

    v_level := CASE
      WHEN v_index >= 80 THEN 'critical'
      WHEN v_index >= 60 THEN 'high'
      WHEN v_index >= 40 THEN 'medium'
      ELSE 'low'
    END;

    v_reason := CASE
      WHEN v_inc_score >= 50 THEN 'Incidentes ativos demandam atenção imediata'
      WHEN v_comp_score >= 60 THEN 'Camada incompleta — UI/backend/dados faltando'
      WHEN v_int_score >= 50 THEN 'Integração com outros módulos incompleta'
      WHEN v_impact >= 50 THEN 'Hub de dependências — alto impacto se quebrar'
      WHEN v_vis_score >= 50 THEN 'Camada invisível ou sem rota'
      WHEN v_dep_score >= 50 THEN 'Muitas dependências — risco em cascata'
      ELSE 'Estável'
    END;

    INSERT INTO execution_priority_registry (
      layer_code, impact_score, dependency_score, incident_score,
      visibility_score, integration_score, completion_score,
      execution_priority_index, priority_level, priority_reason,
      dependency_count, impacted_count, incident_count, updated_at
    ) VALUES (
      v_layer.code, v_impact, v_dep_score, v_inc_score,
      v_vis_score, v_int_score, v_comp_score,
      v_index, v_level, v_reason,
      v_dep_out, v_dep_in, v_incidents, now()
    )
    ON CONFLICT (layer_code) DO UPDATE SET
      impact_score = EXCLUDED.impact_score,
      dependency_score = EXCLUDED.dependency_score,
      incident_score = EXCLUDED.incident_score,
      visibility_score = EXCLUDED.visibility_score,
      integration_score = EXCLUDED.integration_score,
      completion_score = EXCLUDED.completion_score,
      execution_priority_index = EXCLUDED.execution_priority_index,
      priority_level = EXCLUDED.priority_level,
      priority_reason = EXCLUDED.priority_reason,
      dependency_count = EXCLUDED.dependency_count,
      impacted_count = EXCLUDED.impacted_count,
      incident_count = EXCLUDED.incident_count,
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.execution_priority_summary()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'critical', (SELECT count(*) FROM execution_priority_registry WHERE priority_level='critical'),
    'high', (SELECT count(*) FROM execution_priority_registry WHERE priority_level='high'),
    'medium', (SELECT count(*) FROM execution_priority_registry WHERE priority_level='medium'),
    'low', (SELECT count(*) FROM execution_priority_registry WHERE priority_level='low'),
    'blocking_hubs', (SELECT count(*) FROM execution_priority_registry WHERE impact_score >= 50 AND completion_score >= 30),
    'incomplete', (SELECT count(*) FROM execution_priority_registry WHERE completion_score >= 30),
    'no_integration', (SELECT count(*) FROM execution_priority_registry WHERE integration_score >= 50),
    'invisible_menu', (SELECT count(*) FROM architecture_layer_status WHERE menu_exists IN ('red','gray')),
    'no_route', (SELECT count(*) FROM architecture_layer_status WHERE route_exists IN ('red','gray')),
    'last_recalculated_at', (SELECT max(updated_at) FROM execution_priority_registry)
  );
$$;

SELECT public.recompute_execution_priorities();