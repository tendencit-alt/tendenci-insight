
-- Knowledge Articles
CREATE TABLE IF NOT EXISTS public.knowledge_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner','intermediate','advanced')),
  read_time_minutes INTEGER DEFAULT 5,
  related_articles UUID[] DEFAULT '{}',
  screen_key TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active articles" ON public.knowledge_articles;
CREATE POLICY "Anyone can read active articles" ON public.knowledge_articles FOR SELECT TO authenticated USING (active = true);
DROP POLICY IF EXISTS "Owner full access knowledge_articles" ON public.knowledge_articles;
CREATE POLICY "Owner full access knowledge_articles" ON public.knowledge_articles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);

-- Guided Tutorials
CREATE TABLE IF NOT EXISTS public.guided_tutorials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  screen_key TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  total_steps INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.guided_tutorials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active tutorials" ON public.guided_tutorials;
CREATE POLICY "Anyone can read active tutorials" ON public.guided_tutorials FOR SELECT TO authenticated USING (active = true);
DROP POLICY IF EXISTS "Owner full access guided_tutorials" ON public.guided_tutorials;
CREATE POLICY "Owner full access guided_tutorials" ON public.guided_tutorials FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);

-- Tutorial Progress
CREATE TABLE IF NOT EXISTS public.tutorial_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutorial_id UUID NOT NULL REFERENCES public.guided_tutorials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tutorial_id, user_id)
);
ALTER TABLE public.tutorial_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own progress" ON public.tutorial_progress;
CREATE POLICY "Users manage own progress" ON public.tutorial_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Dynamic FAQ
CREATE TABLE IF NOT EXISTS public.faq_dynamic_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual','ticket','error','usage')),
  source_reference TEXT,
  frequency INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.faq_dynamic_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active faq" ON public.faq_dynamic_items;
CREATE POLICY "Anyone can read active faq" ON public.faq_dynamic_items FOR SELECT TO authenticated USING (active = true);
DROP POLICY IF EXISTS "Owner full access faq_dynamic_items" ON public.faq_dynamic_items;
CREATE POLICY "Owner full access faq_dynamic_items" ON public.faq_dynamic_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);

-- Diagnostic Rules
CREATE TABLE IF NOT EXISTS public.diagnostic_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  detection_type TEXT NOT NULL,
  module TEXT NOT NULL,
  condition JSONB DEFAULT '{}',
  probable_cause TEXT,
  recommended_action TEXT,
  related_article_id UUID REFERENCES public.knowledge_articles(id),
  related_tutorial_id UUID REFERENCES public.guided_tutorials(id),
  active BOOLEAN NOT NULL DEFAULT true,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.diagnostic_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner full access diagnostic_rules" ON public.diagnostic_rules;
CREATE POLICY "Owner full access diagnostic_rules" ON public.diagnostic_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);

-- Help Search Logs
CREATE TABLE IF NOT EXISTS public.help_search_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  clicked_article_id UUID REFERENCES public.knowledge_articles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.help_search_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner full access help_search_logs" ON public.help_search_logs;
CREATE POLICY "Owner full access help_search_logs" ON public.help_search_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
DROP POLICY IF EXISTS "Users insert own logs" ON public.help_search_logs;
CREATE POLICY "Users insert own logs" ON public.help_search_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Self-Service Events
CREATE TABLE IF NOT EXISTS public.self_service_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  resolution_type TEXT NOT NULL CHECK (resolution_type IN ('article','tutorial','faq','diagnostic')),
  reference_id UUID,
  module TEXT,
  resolved_without_ticket BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.self_service_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner full access self_service_events" ON public.self_service_events;
CREATE POLICY "Owner full access self_service_events" ON public.self_service_events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
DROP POLICY IF EXISTS "Users insert own events" ON public.self_service_events;
CREATE POLICY "Users insert own events" ON public.self_service_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
