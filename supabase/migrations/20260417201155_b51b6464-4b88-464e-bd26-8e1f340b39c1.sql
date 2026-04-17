-- ARCHITECTURE MASTER BOARD
CREATE TABLE public.architecture_layers_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  "group" text NOT NULL,
  owner_area text,
  priority int NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'active',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.architecture_layer_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_code text NOT NULL UNIQUE REFERENCES public.architecture_layers_registry(code) ON DELETE CASCADE,
  ui_exists text NOT NULL DEFAULT 'gray',
  backend_exists text NOT NULL DEFAULT 'gray',
  route_exists text NOT NULL DEFAULT 'gray',
  menu_exists text NOT NULL DEFAULT 'gray',
  data_connected text NOT NULL DEFAULT 'gray',
  integration_connected text NOT NULL DEFAULT 'gray',
  health_status text NOT NULL DEFAULT 'gray',
  expected_route text,
  actual_route text,
  menu_expected boolean DEFAULT true,
  menu_found boolean DEFAULT false,
  sidebar_present boolean DEFAULT false,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.architecture_layer_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_code text NOT NULL REFERENCES public.architecture_layers_registry(code) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_name text NOT NULL,
  is_connected boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.architecture_layer_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_code text NOT NULL REFERENCES public.architecture_layers_registry(code) ON DELETE CASCADE,
  depends_on_layer_code text NOT NULL REFERENCES public.architecture_layers_registry(code) ON DELETE CASCADE,
  dependency_type text NOT NULL DEFAULT 'data',
  is_critical boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(layer_code, depends_on_layer_code, dependency_type)
);

CREATE INDEX idx_arch_status_health ON public.architecture_layer_status(health_status);
CREATE INDEX idx_arch_layers_group ON public.architecture_layers_registry("group");
CREATE INDEX idx_arch_layers_area ON public.architecture_layers_registry(owner_area);
CREATE INDEX idx_arch_data_sources_layer ON public.architecture_layer_data_sources(layer_code);
CREATE INDEX idx_arch_deps_layer ON public.architecture_layer_dependencies(layer_code);

ALTER TABLE public.architecture_layers_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_layer_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_layer_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_layer_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_arch_registry" ON public.architecture_layers_registry
  FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "owner_all_arch_status" ON public.architecture_layer_status
  FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "owner_all_arch_data_sources" ON public.architecture_layer_data_sources
  FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY "owner_all_arch_deps" ON public.architecture_layer_dependencies
  FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE OR REPLACE FUNCTION public.architecture_health_summary()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total_layers', (SELECT count(*) FROM architecture_layers_registry),
    'fully_active', (SELECT count(*) FROM architecture_layer_status
      WHERE ui_exists='green' AND backend_exists='green' AND route_exists='green'
        AND menu_exists='green' AND data_connected='green' AND integration_connected='green'),
    'partial', (SELECT count(*) FROM architecture_layer_status WHERE health_status='yellow'),
    'missing_menu', (SELECT count(*) FROM architecture_layer_status WHERE menu_exists IN ('red','gray')),
    'missing_route', (SELECT count(*) FROM architecture_layer_status WHERE route_exists IN ('red','gray')),
    'missing_ui', (SELECT count(*) FROM architecture_layer_status WHERE ui_exists IN ('red','gray')),
    'missing_backend', (SELECT count(*) FROM architecture_layer_status WHERE backend_exists IN ('red','gray')),
    'missing_data', (SELECT count(*) FROM architecture_layer_status WHERE data_connected IN ('red','gray')),
    'incomplete_integration', (SELECT count(*) FROM architecture_layer_status WHERE integration_connected IN ('red','yellow','gray'))
  );
$$;

INSERT INTO public.architecture_layers_registry (code, name, "group", owner_area, priority, description) VALUES
  ('home_launcher','Home Launcher','navigation','global',10,'Cockpit principal de entrada'),
  ('control_tower','Control Tower Owner','observability','owner',10,'Cockpit agregador Owner'),
  ('smart_admin','Smart Admin','admin','owner',20,'Administração inteligente de tenants'),
  ('billing_ops','Billing Ops','revenue','owner',20,'Operações de billing'),
  ('lifecycle','Tenant Lifecycle','lifecycle','owner',20,'Ciclo de vida de tenants'),
  ('integration_map','Integration Map','observability','owner',30,'Mapa de integrações'),
  ('dependency_impact','Dependency Impact','observability','owner',30,'Cascade de impacto'),
  ('recovery_actions','Recovery Actions','self_healing','owner',40,'Catálogo de recoveries'),
  ('incident_timeline','Incident Timeline','observability','owner',40,'Timeline de incidentes'),
  ('runbooks','Runbooks','self_healing','owner',50,'Playbooks operacionais'),
  ('self_healing_policies','Self-Healing Policies','self_healing','owner',50,'Guardrails de auto-recovery'),
  ('entitlements','Entitlements Center','revenue','owner',60,'Grants e features'),
  ('upgrade_layer','Upgrade Center','revenue','owner',60,'Sinais de upgrade'),
  ('offer_orchestration','Offer Center','revenue','owner',60,'Catálogo de ofertas'),
  ('automation_center','Automation Center','automation','owner',70,'Sugestões e automações'),
  ('permissions_debug','Permission Debug','security','owner',80,'Debug de permissões');

INSERT INTO public.architecture_layer_status
  (layer_code, ui_exists, backend_exists, route_exists, menu_exists, data_connected, integration_connected, health_status, expected_route, actual_route, menu_found, sidebar_present)
VALUES
  ('home_launcher','green','green','green','green','green','green','green','/central-navegacao','/central-navegacao',true,true),
  ('control_tower','green','green','green','green','green','green','green','/owner/control-tower','/owner/control-tower',true,true),
  ('smart_admin','green','green','green','green','green','green','green','/owner/admin','/owner/admin',true,true),
  ('billing_ops','green','green','green','green','green','green','green','/owner/billing-ops','/owner/billing-ops',true,true),
  ('lifecycle','green','green','green','green','green','green','green','/owner/lifecycle','/owner/lifecycle',true,true),
  ('integration_map','green','green','green','green','green','green','green','/owner/integration-map','/owner/integration-map',true,true),
  ('dependency_impact','green','green','green','green','green','green','green','/owner/dependency-impact','/owner/dependency-impact',true,true),
  ('recovery_actions','green','green','green','green','green','green','green','/owner/recovery-actions','/owner/recovery-actions',true,true),
  ('incident_timeline','green','green','green','green','green','green','green','/owner/incident-timeline','/owner/incident-timeline',true,true),
  ('runbooks','green','green','green','green','green','green','green','/owner/runbooks','/owner/runbooks',true,true),
  ('self_healing_policies','green','green','green','green','green','green','green','/owner/self-healing','/owner/self-healing',true,true),
  ('entitlements','green','green','green','green','green','green','green','/owner/entitlements','/owner/entitlements',true,true),
  ('upgrade_layer','green','green','green','green','green','yellow','yellow','/owner/upgrade-center','/owner/upgrade-center',true,true),
  ('offer_orchestration','green','green','green','green','green','green','green','/owner/offer-center','/owner/offer-center',true,true),
  ('automation_center','green','green','green','green','green','green','green','/owner/automation-center','/owner/automation-center',true,true),
  ('permissions_debug','green','green','green','green','green','green','green','/owner/permission-debug','/owner/permission-debug',true,true);

UPDATE public.architecture_layer_status SET notes='upgrade_trials table pending — non-blocking' WHERE layer_code='upgrade_layer';

INSERT INTO public.architecture_layer_data_sources (layer_code, source_type, source_name, is_connected) VALUES
  ('integration_map','table','integration_health_events',true),
  ('integration_map','table','integration_health_snapshots',true),
  ('integration_map','table','system_modules',true),
  ('integration_map','table','system_module_integrations',true),
  ('dependency_impact','table','dependency_impact_events',true),
  ('dependency_impact','table','dependency_impact_snapshots',true),
  ('dependency_impact','table','root_cause_analysis_events',true),
  ('recovery_actions','table','recovery_catalog',true),
  ('recovery_actions','table','recovery_execution_logs',true),
  ('recovery_actions','table','auto_recovery_rules',true),
  ('incident_timeline','table','system_incidents',true),
  ('incident_timeline','table','incident_timeline_events',true),
  ('incident_timeline','table','incident_status_history',true),
  ('incident_timeline','table','incident_root_cause_summary',true),
  ('runbooks','table','runbook_catalog',true),
  ('runbooks','table','runbook_steps',true),
  ('runbooks','table','runbook_executions',true),
  ('runbooks','table','runbook_validation_rules',true),
  ('runbooks','table','runbook_escalation_rules',true),
  ('self_healing_policies','table','self_healing_policy_registry',true),
  ('self_healing_policies','table','self_healing_retry_budgets',true),
  ('self_healing_policies','table','self_healing_guardrail_logs',true),
  ('self_healing_policies','table','self_healing_escalations',true),
  ('self_healing_policies','table','self_healing_stability_checks',true),
  ('smart_admin','table','tenants',true),
  ('smart_admin','table','subscriptions',true),
  ('smart_admin','table','plan_versions',true),
  ('smart_admin','table','customer_health_scores',true),
  ('billing_ops','table','invoices',true),
  ('billing_ops','table','billing_events',true),
  ('billing_ops','table','billing_dunning_steps',true),
  ('billing_ops','table','billing_discounts',true),
  ('lifecycle','table','tenant_lifecycle_snapshots',true),
  ('lifecycle','table','customer_health_scores',true),
  ('entitlements','table','tenant_entitlement_grants',true),
  ('entitlements','table','feature_flags',true),
  ('entitlements','table','feature_flag_overrides',true),
  ('upgrade_layer','table','upgrade_signals',true),
  ('upgrade_layer','table','upgrade_ui_events',true),
  ('upgrade_layer','table','upgrade_trials',false),
  ('offer_orchestration','table','offer_catalog',true),
  ('offer_orchestration','table','offer_priority_rules',true),
  ('offer_orchestration','table','offer_eligibility_rules',true),
  ('offer_orchestration','table','offer_delivery_events',true),
  ('offer_orchestration','table','offer_suppression_log',true),
  ('automation_center','table','automation_rules',true),
  ('automation_center','table','automation_suggestions',true),
  ('automation_center','table','automation_execution_logs',true),
  ('control_tower','function','calc_owner_control_tower_kpis',true),
  ('home_launcher','function','launcher quick actions',true),
  ('permissions_debug','table','user_roles',true);

INSERT INTO public.architecture_layer_dependencies (layer_code, depends_on_layer_code, dependency_type, is_critical) VALUES
  ('control_tower','lifecycle','data',true),
  ('control_tower','billing_ops','data',true),
  ('control_tower','integration_map','data',true),
  ('control_tower','smart_admin','data',true),
  ('recovery_actions','dependency_impact','data',true),
  ('recovery_actions','incident_timeline','data',true),
  ('incident_timeline','dependency_impact','data',true),
  ('incident_timeline','recovery_actions','data',false),
  ('runbooks','recovery_actions','execution',true),
  ('runbooks','incident_timeline','data',true),
  ('self_healing_policies','runbooks','execution',true),
  ('self_healing_policies','recovery_actions','execution',true),
  ('self_healing_policies','dependency_impact','data',true),
  ('dependency_impact','integration_map','data',true),
  ('upgrade_layer','entitlements','execution',true),
  ('offer_orchestration','upgrade_layer','data',true),
  ('offer_orchestration','entitlements','data',true),
  ('billing_ops','entitlements','execution',true),
  ('lifecycle','billing_ops','data',true),
  ('lifecycle','smart_admin','data',false),
  ('automation_center','self_healing_policies','data',false);