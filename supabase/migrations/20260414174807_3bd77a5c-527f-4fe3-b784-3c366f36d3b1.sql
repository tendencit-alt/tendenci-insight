
-- Template base versionado
CREATE TABLE public.config_base_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  description TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.config_base_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view templates"
  ON public.config_base_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Owner can manage templates"
  ON public.config_base_templates FOR ALL TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

-- Override controlado por empresa
CREATE TABLE public.config_tenant_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.config_base_templates(id) ON DELETE CASCADE,
  override_type TEXT NOT NULL,
  target_key TEXT NOT NULL,
  original_value TEXT,
  custom_value TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.config_tenant_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tenant overrides"
  ON public.config_tenant_overrides FOR SELECT TO authenticated
  USING (tenant_id = (SELECT public.get_user_tenant_id()) OR public.is_owner());

CREATE POLICY "Users create own tenant overrides"
  ON public.config_tenant_overrides FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT public.get_user_tenant_id()) OR public.is_owner());

CREATE POLICY "Users update own tenant overrides"
  ON public.config_tenant_overrides FOR UPDATE TO authenticated
  USING ((tenant_id = (SELECT public.get_user_tenant_id()) AND is_locked = false) OR public.is_owner());

CREATE POLICY "Users delete own tenant overrides"
  ON public.config_tenant_overrides FOR DELETE TO authenticated
  USING (tenant_id = (SELECT public.get_user_tenant_id()) OR public.is_owner());

-- Lock estrutural por módulo
CREATE TABLE public.config_structural_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT true,
  locked_by UUID,
  locked_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.config_structural_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view locks"
  ON public.config_structural_locks FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Owner can manage locks"
  ON public.config_structural_locks FOR ALL TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

-- Log divergência estrutural
CREATE TABLE public.config_divergence_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL,
  divergence_type TEXT NOT NULL,
  target_key TEXT NOT NULL,
  original_value TEXT,
  current_value TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.config_divergence_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tenant divergence"
  ON public.config_divergence_log FOR SELECT TO authenticated
  USING (tenant_id = (SELECT public.get_user_tenant_id()) OR public.is_owner());

CREATE POLICY "Authenticated can insert divergence"
  ON public.config_divergence_log FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT public.get_user_tenant_id()) OR public.is_owner());

-- Seed locks padrão
INSERT INTO public.config_structural_locks (module_key, display_name, is_locked, reason) VALUES
  ('dre_structure', 'Estrutura DRE', true, 'Estrutura financeira core protegida'),
  ('chart_of_accounts', 'Plano de Contas Base', true, 'Hierarquia contábil padronizada'),
  ('automations', 'Automações Críticas', true, 'Regras de automação sistêmicas'),
  ('dashboards', 'Dashboards Base', true, 'Painéis gerenciais padrão'),
  ('margin_calculation', 'Cálculo Margem Contribuição', true, 'Fórmulas financeiras protegidas'),
  ('ebitda_calculation', 'Cálculo EBITDA', true, 'Fórmulas financeiras protegidas');

-- Indexes
CREATE INDEX idx_config_overrides_tenant ON public.config_tenant_overrides(tenant_id);
CREATE INDEX idx_config_overrides_template ON public.config_tenant_overrides(template_id);
CREATE INDEX idx_config_divergence_tenant ON public.config_divergence_log(tenant_id);
CREATE INDEX idx_config_divergence_type ON public.config_divergence_log(template_type);
CREATE INDEX idx_config_templates_type ON public.config_base_templates(template_type, is_active);
