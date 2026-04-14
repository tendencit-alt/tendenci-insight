
-- Only create tables that don't exist yet
CREATE TABLE IF NOT EXISTS public.success_playbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_condition JSONB DEFAULT '{}',
  actions JSONB DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 5,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.success_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  source_module TEXT,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_interventions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  playbook_id UUID REFERENCES public.success_playbooks(id),
  intervention_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expansion_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  description TEXT,
  current_value NUMERIC DEFAULT 0,
  limit_value NUMERIC DEFAULT 0,
  recommended_action TEXT,
  status TEXT NOT NULL DEFAULT 'detected',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure RLS and policies exist (idempotent)
ALTER TABLE public.success_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.success_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expansion_signals ENABLE ROW LEVEL SECURITY;

-- Add missing columns to support_tickets if needed
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS resolution_time_hours NUMERIC;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- Policies (drop if exist then recreate)
DROP POLICY IF EXISTS "Owner full access success_playbooks" ON public.success_playbooks;
CREATE POLICY "Owner full access success_playbooks" ON public.success_playbooks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);

DROP POLICY IF EXISTS "Owner full access success_alerts" ON public.success_alerts;
CREATE POLICY "Owner full access success_alerts" ON public.success_alerts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);

DROP POLICY IF EXISTS "Owner full access customer_interventions" ON public.customer_interventions;
CREATE POLICY "Owner full access customer_interventions" ON public.customer_interventions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);

DROP POLICY IF EXISTS "Owner full access expansion_signals" ON public.expansion_signals;
CREATE POLICY "Owner full access expansion_signals" ON public.expansion_signals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
