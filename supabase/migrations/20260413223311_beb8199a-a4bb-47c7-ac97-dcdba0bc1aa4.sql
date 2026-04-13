
-- Automation rules table
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  name text NOT NULL,
  description text,
  event_type text NOT NULL,
  event_module text NOT NULL,
  conditions jsonb DEFAULT '[]'::jsonb,
  actions jsonb DEFAULT '[]'::jsonb,
  priority integer DEFAULT 100,
  is_system boolean DEFAULT false,
  active boolean DEFAULT true,
  last_executed_at timestamptz,
  execution_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view automation rules"
  ON public.automation_rules FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_user_tenant_id()));

CREATE POLICY "Tenant users can manage automation rules"
  ON public.automation_rules FOR ALL TO authenticated
  USING (tenant_id = (SELECT get_user_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));

-- Execution logs table
CREATE TABLE public.automation_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  rule_id uuid REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  rule_name text,
  event_type text NOT NULL,
  event_payload jsonb,
  source_table text,
  source_id text,
  actions_executed jsonb,
  status text DEFAULT 'pendente',
  error_message text,
  execution_time_ms integer,
  triggered_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.automation_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view execution logs"
  ON public.automation_execution_logs FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_user_tenant_id()));

CREATE POLICY "System can insert execution logs"
  ON public.automation_execution_logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_user_tenant_id()));

-- Indexes
CREATE INDEX idx_automation_rules_event ON public.automation_rules(event_type, active);
CREATE INDEX idx_automation_rules_tenant ON public.automation_rules(tenant_id);
CREATE INDEX idx_automation_logs_rule ON public.automation_execution_logs(rule_id);
CREATE INDEX idx_automation_logs_tenant ON public.automation_execution_logs(tenant_id, created_at DESC);
CREATE INDEX idx_automation_logs_status ON public.automation_execution_logs(status);

-- Trigger for updated_at
CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
