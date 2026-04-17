ALTER TABLE public.customer_onboarding
  ADD COLUMN IF NOT EXISTS segment TEXT,
  ADD COLUMN IF NOT EXISTS team_size TEXT,
  ADD COLUMN IF NOT EXISTS primary_goal TEXT,
  ADD COLUMN IF NOT EXISTS financial_maturity TEXT,
  ADD COLUMN IF NOT EXISTS chart_template TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.onboarding_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID,
  step_key TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('started','completed','skipped','abandoned','viewed')),
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_tenant ON public.onboarding_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_step ON public.onboarding_analytics(step_key);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_created ON public.onboarding_analytics(created_at DESC);

ALTER TABLE public.onboarding_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_onboarding_analytics" ON public.onboarding_analytics
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE POLICY "tenant_insert_onboarding_analytics" ON public.onboarding_analytics
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_owner());