
-- Education Tracks
CREATE TABLE IF NOT EXISTS public.education_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner','intermediate','advanced')),
  total_modules INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.education_tracks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active tracks" ON public.education_tracks;
CREATE POLICY "Anyone can read active tracks" ON public.education_tracks FOR SELECT TO authenticated USING (active = true);
DROP POLICY IF EXISTS "Owner full access education_tracks" ON public.education_tracks;
CREATE POLICY "Owner full access education_tracks" ON public.education_tracks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);

-- Education Modules (lessons within tracks)
CREATE TABLE IF NOT EXISTS public.education_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES public.education_tracks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  lesson_type TEXT NOT NULL DEFAULT 'text' CHECK (lesson_type IN ('text','video','interactive','quiz')),
  position INTEGER NOT NULL DEFAULT 0,
  screen_key TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.education_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active modules" ON public.education_modules;
CREATE POLICY "Anyone can read active modules" ON public.education_modules FOR SELECT TO authenticated USING (active = true);
DROP POLICY IF EXISTS "Owner full access education_modules" ON public.education_modules;
CREATE POLICY "Owner full access education_modules" ON public.education_modules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);

-- Education Progress
CREATE TABLE IF NOT EXISTS public.education_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES public.education_tracks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  current_module INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(track_id, user_id)
);
ALTER TABLE public.education_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own education progress" ON public.education_progress;
CREATE POLICY "Users manage own education progress" ON public.education_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Owner read all education_progress" ON public.education_progress;
CREATE POLICY "Owner read all education_progress" ON public.education_progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);

-- Education Certifications (ERP maturity levels per tenant)
CREATE TABLE IF NOT EXISTS public.education_certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'iniciado' CHECK (level IN ('iniciado','operacional','estruturado','gerencial','estrategico')),
  score INTEGER NOT NULL DEFAULT 0,
  criteria_snapshot JSONB DEFAULT '{}',
  certified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.education_certifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner full access education_certifications" ON public.education_certifications;
CREATE POLICY "Owner full access education_certifications" ON public.education_certifications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
DROP POLICY IF EXISTS "Tenant read own certifications" ON public.education_certifications;
CREATE POLICY "Tenant read own certifications" ON public.education_certifications FOR SELECT TO authenticated USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Education Recommendations
CREATE TABLE IF NOT EXISTS public.education_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  screen_key TEXT,
  recommendation TEXT NOT NULL,
  related_track_id UUID REFERENCES public.education_tracks(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','dismissed','completed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.education_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner full access education_recommendations" ON public.education_recommendations;
CREATE POLICY "Owner full access education_recommendations" ON public.education_recommendations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
DROP POLICY IF EXISTS "Tenant read own recommendations" ON public.education_recommendations;
CREATE POLICY "Tenant read own recommendations" ON public.education_recommendations FOR SELECT TO authenticated USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Education Completion Events
CREATE TABLE IF NOT EXISTS public.education_completion_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('track_started','module_completed','track_completed','certification_earned')),
  track_id UUID REFERENCES public.education_tracks(id),
  module_id UUID REFERENCES public.education_modules(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.education_completion_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner full access education_completion_events" ON public.education_completion_events;
CREATE POLICY "Owner full access education_completion_events" ON public.education_completion_events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
DROP POLICY IF EXISTS "Users insert own completion events" ON public.education_completion_events;
CREATE POLICY "Users insert own completion events" ON public.education_completion_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
