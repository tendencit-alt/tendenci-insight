
-- Product Analytics Events table
CREATE TABLE public.product_analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  session_id TEXT,
  event_type TEXT NOT NULL,
  module TEXT,
  feature TEXT,
  metadata JSONB DEFAULT '{}',
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX idx_pae_tenant ON public.product_analytics_events(tenant_id);
CREATE INDEX idx_pae_created ON public.product_analytics_events(created_at DESC);
CREATE INDEX idx_pae_type ON public.product_analytics_events(event_type);
CREATE INDEX idx_pae_module ON public.product_analytics_events(module);
CREATE INDEX idx_pae_tenant_module ON public.product_analytics_events(tenant_id, module);

-- RLS
ALTER TABLE public.product_analytics_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own events
CREATE POLICY "Users can insert own analytics events"
  ON public.product_analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Owner can read all
CREATE POLICY "Owner can read all analytics"
  ON public.product_analytics_events
  FOR SELECT
  TO authenticated
  USING (public.is_owner());

-- Tenant admins can read their own tenant data
CREATE POLICY "Tenant users can read own analytics"
  ON public.product_analytics_events
  FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
