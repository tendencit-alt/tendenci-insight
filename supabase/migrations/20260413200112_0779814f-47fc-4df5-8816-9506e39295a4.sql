
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  skipped boolean NOT NULL DEFAULT false,
  data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tenant ON public.onboarding_progress(tenant_id);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view onboarding_progress" ON public.onboarding_progress
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert onboarding_progress" ON public.onboarding_progress
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update onboarding_progress" ON public.onboarding_progress
  FOR UPDATE TO authenticated USING (true);

-- Add onboarding_completed flag to company_settings
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
