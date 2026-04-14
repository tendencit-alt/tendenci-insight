
-- Plan features (which features each plan unlocks)
CREATE TABLE public.plan_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.tenant_plans(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, feature_key)
);
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access plan_features" ON public.plan_features FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
CREATE POLICY "Authenticated read plan_features" ON public.plan_features FOR SELECT TO authenticated USING (true);

-- Plan limits
CREATE TABLE public.plan_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.tenant_plans(id) ON DELETE CASCADE,
  limit_key TEXT NOT NULL,
  limit_name TEXT NOT NULL,
  limit_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, limit_key)
);
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access plan_limits" ON public.plan_limits FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
CREATE POLICY "Authenticated read plan_limits" ON public.plan_limits FOR SELECT TO authenticated USING (true);

-- Add columns to tenant_plans if missing
ALTER TABLE public.tenant_plans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.tenant_plans ADD COLUMN IF NOT EXISTS yearly_price NUMERIC DEFAULT 0;
ALTER TABLE public.tenant_plans ADD COLUMN IF NOT EXISTS max_companies INTEGER DEFAULT 1;
ALTER TABLE public.tenant_plans ADD COLUMN IF NOT EXISTS max_projects INTEGER DEFAULT 0;
ALTER TABLE public.tenant_plans ADD COLUMN IF NOT EXISTS max_orders INTEGER DEFAULT 0;
ALTER TABLE public.tenant_plans ADD COLUMN IF NOT EXISTS max_storage_mb INTEGER DEFAULT 500;

-- Subscriptions
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.tenant_plans(id),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','past_due','suspended','cancelled')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  trial_ends_at TIMESTAMPTZ,
  payment_method TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access subscriptions" ON public.subscriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
CREATE POLICY "Tenant read own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Subscription history
CREATE TABLE public.subscription_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  event_type TEXT NOT NULL,
  from_plan_id UUID REFERENCES public.tenant_plans(id),
  to_plan_id UUID REFERENCES public.tenant_plans(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access subscription_history" ON public.subscription_history FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
CREATE POLICY "Tenant read own history" ON public.subscription_history FOR SELECT TO authenticated USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Usage consumption
CREATE TABLE public.usage_consumption (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  limit_value NUMERIC NOT NULL DEFAULT 0,
  overage_unit_price NUMERIC DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()),
  period_end TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, metric_key, period_start)
);
ALTER TABLE public.usage_consumption ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access usage_consumption" ON public.usage_consumption FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
CREATE POLICY "Tenant read own usage" ON public.usage_consumption FOR SELECT TO authenticated USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Invoices
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  subscription_id UUID REFERENCES public.subscriptions(id),
  invoice_number SERIAL,
  amount NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','paid','failed','void')),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_attempts INTEGER NOT NULL DEFAULT 0,
  line_items JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access invoices" ON public.invoices FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
CREATE POLICY "Tenant read own invoices" ON public.invoices FOR SELECT TO authenticated USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Billing events
CREATE TABLE public.billing_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  invoice_id UUID REFERENCES public.invoices(id),
  event_type TEXT NOT NULL,
  status TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access billing_events" ON public.billing_events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
CREATE POLICY "Tenant read own events" ON public.billing_events FOR SELECT TO authenticated USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);
