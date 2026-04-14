
-- Customer Onboarding
CREATE TABLE public.customer_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  setup_completed BOOLEAN NOT NULL DEFAULT false,
  setup_completed_at TIMESTAMPTZ,
  first_import BOOLEAN NOT NULL DEFAULT false,
  first_import_at TIMESTAMPTZ,
  first_reconciliation BOOLEAN NOT NULL DEFAULT false,
  first_reconciliation_at TIMESTAMPTZ,
  first_dre BOOLEAN NOT NULL DEFAULT false,
  first_dre_at TIMESTAMPTZ,
  first_dashboard BOOLEAN NOT NULL DEFAULT false,
  first_dashboard_at TIMESTAMPTZ,
  progress_pct NUMERIC GENERATED ALWAYS AS (
    ((CASE WHEN setup_completed THEN 20 ELSE 0 END) +
     (CASE WHEN first_import THEN 20 ELSE 0 END) +
     (CASE WHEN first_reconciliation THEN 20 ELSE 0 END) +
     (CASE WHEN first_dre THEN 20 ELSE 0 END) +
     (CASE WHEN first_dashboard THEN 20 ELSE 0 END))
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access customer_onboarding" ON public.customer_onboarding FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
CREATE POLICY "Tenant read own onboarding" ON public.customer_onboarding FOR SELECT TO authenticated USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Customer Activation
CREATE TABLE public.customer_activation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL,
  milestone_name TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  days_to_activate INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, milestone_key)
);
ALTER TABLE public.customer_activation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access customer_activation" ON public.customer_activation FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
CREATE POLICY "Tenant read own activation" ON public.customer_activation FOR SELECT TO authenticated USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Customer Adoption (monthly snapshots)
CREATE TABLE public.customer_adoption (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_month DATE NOT NULL DEFAULT date_trunc('month', now()),
  modules_used JSONB DEFAULT '[]',
  features_used JSONB DEFAULT '[]',
  active_users INTEGER NOT NULL DEFAULT 0,
  days_without_use INTEGER NOT NULL DEFAULT 0,
  adoption_score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, period_month)
);
ALTER TABLE public.customer_adoption ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access customer_adoption" ON public.customer_adoption FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
CREATE POLICY "Tenant read own adoption" ON public.customer_adoption FOR SELECT TO authenticated USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Customer Health Scores
CREATE TABLE public.customer_health_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  usage_score NUMERIC NOT NULL DEFAULT 0,
  activation_score NUMERIC NOT NULL DEFAULT 0,
  reconciliation_score NUMERIC NOT NULL DEFAULT 0,
  dre_score NUMERIC NOT NULL DEFAULT 0,
  payment_score NUMERIC NOT NULL DEFAULT 0,
  support_score NUMERIC NOT NULL DEFAULT 0,
  access_score NUMERIC NOT NULL DEFAULT 0,
  total_score NUMERIC GENERATED ALWAYS AS (
    (usage_score + activation_score + reconciliation_score + dre_score + payment_score + support_score + access_score) / 7
  ) STORED,
  classification TEXT GENERATED ALWAYS AS (
    CASE
      WHEN (usage_score + activation_score + reconciliation_score + dre_score + payment_score + support_score + access_score) / 7 >= 75 THEN 'healthy'
      WHEN (usage_score + activation_score + reconciliation_score + dre_score + payment_score + support_score + access_score) / 7 >= 50 THEN 'attention'
      WHEN (usage_score + activation_score + reconciliation_score + dre_score + payment_score + support_score + access_score) / 7 >= 25 THEN 'risk'
      ELSE 'critical'
    END
  ) STORED,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);
ALTER TABLE public.customer_health_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access customer_health_scores" ON public.customer_health_scores FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
CREATE POLICY "Tenant read own health" ON public.customer_health_scores FOR SELECT TO authenticated USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Customer Retention Events
CREATE TABLE public.customer_retention_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  description TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_retention_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access customer_retention_events" ON public.customer_retention_events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);

-- Customer Expansion Opportunities
CREATE TABLE public.customer_expansion_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  opportunity_type TEXT NOT NULL,
  description TEXT,
  estimated_value NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'detected' CHECK (status IN ('detected','contacted','converted','dismissed')),
  converted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_expansion_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access customer_expansion_opportunities" ON public.customer_expansion_opportunities FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
