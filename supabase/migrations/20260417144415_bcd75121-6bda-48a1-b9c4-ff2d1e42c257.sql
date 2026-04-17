CREATE TABLE IF NOT EXISTS public.automation_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL,
  module TEXT,
  title TEXT NOT NULL,
  description TEXT,
  evidence JSONB DEFAULT '{}'::jsonb,
  impact_preview JSONB DEFAULT '{}'::jsonb,
  proposed_action JSONB DEFAULT '{}'::jsonb,
  confidence NUMERIC DEFAULT 0,
  occurrences INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','dismissed','expired','applied')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  applied_resource_id UUID,
  applied_resource_type TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_sugg_tenant ON public.automation_suggestions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_auto_sugg_type ON public.automation_suggestions(suggestion_type);

CREATE TABLE IF NOT EXISTS public.automation_suggestion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  suggestion_id UUID REFERENCES public.automation_suggestions(id) ON DELETE CASCADE,
  user_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('shown','accepted','dismissed','expired','applied','reverted')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_sugg_evt_tenant ON public.automation_suggestion_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_auto_sugg_evt_sugg ON public.automation_suggestion_events(suggestion_id);

ALTER TABLE public.automation_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_suggestion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_auto_sugg" ON public.automation_suggestions
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() OR public.is_owner());
CREATE POLICY "tenant_insert_auto_sugg" ON public.automation_suggestions
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_owner());
CREATE POLICY "tenant_update_auto_sugg" ON public.automation_suggestions
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE POLICY "tenant_select_auto_sugg_evt" ON public.automation_suggestion_events
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() OR public.is_owner());
CREATE POLICY "tenant_insert_auto_sugg_evt" ON public.automation_suggestion_events
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE TRIGGER trg_auto_sugg_updated
BEFORE UPDATE ON public.automation_suggestions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();