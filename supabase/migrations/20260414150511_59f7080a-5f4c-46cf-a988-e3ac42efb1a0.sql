
-- Tenant customizations table (one row per tenant)
CREATE TABLE public.tenant_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  module_aliases JSONB DEFAULT '{}'::jsonb,
  dre_aliases JSONB DEFAULT '{}'::jsonb,
  sidebar_config JSONB DEFAULT '{"order":[],"hidden":[]}'::jsonb,
  launcher_shortcuts JSONB DEFAULT '[]'::jsonb,
  kpi_priorities JSONB DEFAULT '[]'::jsonb,
  workflow_config JSONB DEFAULT '{}'::jsonb,
  segment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tenant_customizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view own customizations" ON public.tenant_customizations
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant admins can update own customizations" ON public.tenant_customizations
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant admins can insert own customizations" ON public.tenant_customizations
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Owner can manage all customizations" ON public.tenant_customizations
  FOR ALL TO authenticated
  USING (public.is_owner());

-- Snapshots for config versioning
CREATE TABLE public.tenant_customization_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  snapshot JSONB NOT NULL,
  label TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tenant_customization_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view own snapshots" ON public.tenant_customization_snapshots
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can create snapshots" ON public.tenant_customization_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Owner can manage all snapshots" ON public.tenant_customization_snapshots
  FOR ALL TO authenticated
  USING (public.is_owner());
