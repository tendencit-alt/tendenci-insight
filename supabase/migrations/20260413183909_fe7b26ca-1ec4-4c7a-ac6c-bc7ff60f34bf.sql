
-- Finance permission profiles
CREATE TABLE public.fin_permission_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  profile_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, profile_key)
);

ALTER TABLE public.fin_permission_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation fin_permission_profiles"
  ON public.fin_permission_profiles FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Granular permissions per profile
CREATE TABLE public.fin_profile_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  profile_id UUID REFERENCES public.fin_permission_profiles(id) ON DELETE CASCADE NOT NULL,
  permission_key TEXT NOT NULL,
  permission_label TEXT NOT NULL,
  permission_group TEXT NOT NULL,
  allowed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, permission_key)
);

ALTER TABLE public.fin_profile_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation fin_profile_permissions"
  ON public.fin_profile_permissions FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- User-to-finance-profile mapping
CREATE TABLE public.fin_user_finance_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  finance_profile_id UUID REFERENCES public.fin_permission_profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

ALTER TABLE public.fin_user_finance_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation fin_user_finance_profiles"
  ON public.fin_user_finance_profiles FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE INDEX idx_fin_user_profiles ON public.fin_user_finance_profiles(tenant_id, user_id);
