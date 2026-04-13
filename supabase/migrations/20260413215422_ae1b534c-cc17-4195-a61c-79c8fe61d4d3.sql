
-- Approval Rules: configurable triggers
CREATE TABLE public.approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('financeiro','comercial','operacional','estrutural')),
  trigger_type TEXT NOT NULL,
  description TEXT,
  condition_field TEXT,
  condition_operator TEXT CHECK (condition_operator IN ('>','<','>=','<=','=','!=')),
  condition_value TEXT,
  source_table TEXT,
  priority INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.approval_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_approval_rules" ON public.approval_rules
  FOR ALL USING (tenant_id = public.get_user_tenant_id());

-- Approval Thresholds: value-based escalation
CREATE TABLE public.approval_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.approval_rules(id) ON DELETE CASCADE NOT NULL,
  min_value NUMERIC DEFAULT 0,
  max_value NUMERIC,
  approver_profile_type TEXT,
  approver_user_id UUID,
  requires_second_approval BOOLEAN DEFAULT false,
  second_approver_profile_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.approval_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_approval_thresholds" ON public.approval_thresholds
  FOR ALL USING (tenant_id = public.get_user_tenant_id());

-- Approval Instances: active workflow items
CREATE TABLE public.approval_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.approval_rules(id),
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'solicitado' CHECK (status IN ('rascunho','solicitado','em_revisao','aprovado','rejeitado','liberado','executado','cancelado')),
  requested_by UUID NOT NULL,
  current_approver_id UUID,
  amount NUMERIC,
  description TEXT,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('baixa','normal','alta','critica')),
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  rejection_reason TEXT,
  reopen_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.approval_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_approval_instances" ON public.approval_instances
  FOR ALL USING (tenant_id = public.get_user_tenant_id());

CREATE INDEX idx_approval_instances_status ON public.approval_instances(status);
CREATE INDEX idx_approval_instances_source ON public.approval_instances(source_table, source_id);
CREATE INDEX idx_approval_instances_approver ON public.approval_instances(current_approver_id);

-- Approval Steps: immutable audit trail
CREATE TABLE public.approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES public.approval_instances(id) ON DELETE CASCADE NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('solicitacao','revisao','aprovacao','rejeicao','execucao','cancelamento','reabertura')),
  actor_id UUID NOT NULL,
  from_status TEXT,
  to_status TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_approval_steps" ON public.approval_steps
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_insert_approval_steps" ON public.approval_steps
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE INDEX idx_approval_steps_instance ON public.approval_steps(instance_id);

-- Trigger to auto-set tenant_id
CREATE TRIGGER set_tenant_id_approval_rules BEFORE INSERT ON public.approval_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER set_tenant_id_approval_thresholds BEFORE INSERT ON public.approval_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER set_tenant_id_approval_instances BEFORE INSERT ON public.approval_instances
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER set_tenant_id_approval_steps BEFORE INSERT ON public.approval_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
