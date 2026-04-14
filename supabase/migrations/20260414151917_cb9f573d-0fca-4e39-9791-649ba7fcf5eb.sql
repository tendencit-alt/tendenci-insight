
-- System Releases
CREATE TABLE public.system_releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  improvements JSONB DEFAULT '[]',
  fixes JSONB DEFAULT '[]',
  breaking_changes JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  released_at TIMESTAMP WITH TIME ZONE,
  released_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages releases" ON public.system_releases
  FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE POLICY "Tenants read active releases" ON public.system_releases
  FOR SELECT TO authenticated USING (status = 'active');

-- Feature Flags
CREATE TABLE public.feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  module TEXT,
  status TEXT NOT NULL DEFAULT 'disabled',
  rollout_percentage INTEGER DEFAULT 0,
  pilot_tenant_ids UUID[] DEFAULT '{}',
  release_id UUID REFERENCES public.system_releases(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages feature flags" ON public.feature_flags
  FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE POLICY "Tenants read feature flags" ON public.feature_flags
  FOR SELECT TO authenticated USING (true);

-- Feature Flag Overrides per tenant
CREATE TABLE public.feature_flag_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_id UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(flag_id, tenant_id)
);

ALTER TABLE public.feature_flag_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages overrides" ON public.feature_flag_overrides
  FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE POLICY "Tenants read own overrides" ON public.feature_flag_overrides
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());

-- System Changelog
CREATE TABLE public.system_changelog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID NOT NULL REFERENCES public.system_releases(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL DEFAULT 'feature',
  module TEXT,
  title TEXT NOT NULL,
  description TEXT,
  impact TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages changelog" ON public.system_changelog
  FOR ALL TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE POLICY "Tenants read changelog" ON public.system_changelog
  FOR SELECT TO authenticated USING (true);

-- Indexes
CREATE INDEX idx_ff_key ON public.feature_flags(key);
CREATE INDEX idx_ff_status ON public.feature_flags(status);
CREATE INDEX idx_ffo_tenant ON public.feature_flag_overrides(tenant_id);
CREATE INDEX idx_changelog_release ON public.system_changelog(release_id);
CREATE INDEX idx_releases_status ON public.system_releases(status);
