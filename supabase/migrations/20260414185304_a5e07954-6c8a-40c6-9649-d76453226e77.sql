
CREATE TABLE IF NOT EXISTS public.benchmark_clusters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  segment TEXT,
  porte TEXT,
  maturity_level TEXT,
  criteria JSONB DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.benchmark_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access benchmark_clusters" ON public.benchmark_clusters FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
CREATE POLICY "Authenticated read benchmark_clusters" ON public.benchmark_clusters FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.benchmark_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID NOT NULL REFERENCES public.benchmark_clusters(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('financeiro','operacional','comercial','erp_efficiency')),
  avg_value NUMERIC DEFAULT 0,
  median_value NUMERIC DEFAULT 0,
  p25_value NUMERIC DEFAULT 0,
  p75_value NUMERIC DEFAULT 0,
  p90_value NUMERIC DEFAULT 0,
  sample_size INTEGER DEFAULT 0,
  period TEXT,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.benchmark_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access benchmark_metrics" ON public.benchmark_metrics FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
CREATE POLICY "Authenticated read benchmark_metrics" ON public.benchmark_metrics FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.benchmark_percentile_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cluster_id UUID NOT NULL REFERENCES public.benchmark_clusters(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('financeiro','operacional','comercial','erp_efficiency')),
  metric_key TEXT NOT NULL,
  tenant_value NUMERIC DEFAULT 0,
  percentile INTEGER DEFAULT 0 CHECK (percentile >= 0 AND percentile <= 100),
  period TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.benchmark_percentile_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access benchmark_percentile_scores" ON public.benchmark_percentile_scores FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
CREATE POLICY "Tenant read own percentile scores" ON public.benchmark_percentile_scores FOR SELECT TO authenticated USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.benchmark_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  current_percentile INTEGER DEFAULT 0,
  target_percentile INTEGER DEFAULT 75,
  recommendation TEXT NOT NULL,
  priority INTEGER DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','dismissed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.benchmark_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner full access benchmark_recommendations" ON public.benchmark_recommendations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_owner = true)
);
CREATE POLICY "Tenant read own recommendations" ON public.benchmark_recommendations FOR SELECT TO authenticated USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);
