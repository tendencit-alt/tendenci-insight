
-- Support tickets table
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  reported_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  priority TEXT NOT NULL DEFAULT 'medium',
  module TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  root_cause TEXT,
  recurrence_count INT DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage all tickets" ON public.support_tickets
  FOR ALL TO authenticated
  USING (public.is_owner());

CREATE POLICY "Tenant users can view own tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can create tickets" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Support history / actions log
CREATE TABLE public.support_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  action_type TEXT NOT NULL,
  description TEXT,
  performed_by UUID REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.support_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage all history" ON public.support_history
  FOR ALL TO authenticated
  USING (public.is_owner());

CREATE POLICY "Tenant users can view own history" ON public.support_history
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- Contextual help articles
CREATE TABLE public.contextual_help (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  common_errors JSONB DEFAULT '[]'::jsonb,
  how_to_fix JSONB DEFAULT '[]'::jsonb,
  when_to_open_support TEXT,
  faq JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contextual_help ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read help" ON public.contextual_help
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owner can manage help" ON public.contextual_help
  FOR ALL TO authenticated USING (public.is_owner());
