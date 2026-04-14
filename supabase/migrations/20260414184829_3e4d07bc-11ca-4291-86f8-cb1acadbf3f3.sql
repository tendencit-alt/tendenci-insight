
CREATE TABLE IF NOT EXISTS public.ai_financial_diagnoses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  diagnosis_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  description TEXT NOT NULL,
  probable_cause TEXT,
  estimated_impact TEXT,
  suggested_action TEXT,
  priority INTEGER NOT NULL DEFAULT 5,
  metadata JSONB DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_financial_diagnoses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner full access ai_financial_diagnoses" ON public.ai_financial_diagnoses;
CREATE POLICY "Owner full access ai_financial_diagnoses" ON public.ai_financial_diagnoses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
DROP POLICY IF EXISTS "Tenant read own financial diagnoses" ON public.ai_financial_diagnoses;
CREATE POLICY "Tenant read own financial diagnoses" ON public.ai_financial_diagnoses FOR SELECT TO authenticated USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.ai_operational_diagnoses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  diagnosis_type TEXT NOT NULL,
  maturity_level TEXT DEFAULT 'baixo' CHECK (maturity_level IN ('baixo','medio','alto','avancado')),
  bottlenecks JSONB DEFAULT '[]',
  recommended_actions JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_operational_diagnoses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner full access ai_operational_diagnoses" ON public.ai_operational_diagnoses;
CREATE POLICY "Owner full access ai_operational_diagnoses" ON public.ai_operational_diagnoses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
DROP POLICY IF EXISTS "Tenant read own operational diagnoses" ON public.ai_operational_diagnoses;
CREATE POLICY "Tenant read own operational diagnoses" ON public.ai_operational_diagnoses FOR SELECT TO authenticated USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.ai_priority_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 5,
  source_module TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','dismissed')),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_priority_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner full access ai_priority_actions" ON public.ai_priority_actions;
CREATE POLICY "Owner full access ai_priority_actions" ON public.ai_priority_actions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
DROP POLICY IF EXISTS "Tenant read own priority actions" ON public.ai_priority_actions;
CREATE POLICY "Tenant read own priority actions" ON public.ai_priority_actions FOR SELECT TO authenticated USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.ai_strategy_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  title TEXT NOT NULL,
  explanation TEXT,
  estimated_impact TEXT,
  recommended_action TEXT,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_strategy_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner full access ai_strategy_alerts" ON public.ai_strategy_alerts;
CREATE POLICY "Owner full access ai_strategy_alerts" ON public.ai_strategy_alerts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
DROP POLICY IF EXISTS "Tenant read own strategy alerts" ON public.ai_strategy_alerts;
CREATE POLICY "Tenant read own strategy alerts" ON public.ai_strategy_alerts FOR SELECT TO authenticated USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.ai_impact_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  simulation_type TEXT NOT NULL,
  title TEXT,
  parameters JSONB NOT NULL DEFAULT '{}',
  results JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_impact_simulations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner full access ai_impact_simulations" ON public.ai_impact_simulations;
CREATE POLICY "Owner full access ai_impact_simulations" ON public.ai_impact_simulations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
DROP POLICY IF EXISTS "Tenant manage own simulations" ON public.ai_impact_simulations;
CREATE POLICY "Tenant manage own simulations" ON public.ai_impact_simulations FOR ALL TO authenticated USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
) WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.ai_decision_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('suggested','executed','dismissed','impact_measured')),
  reference_id UUID,
  reference_type TEXT,
  description TEXT,
  impact_after JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_decision_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner full access ai_decision_events" ON public.ai_decision_events;
CREATE POLICY "Owner full access ai_decision_events" ON public.ai_decision_events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
