-- Create table for AI quality metrics
CREATE TABLE IF NOT EXISTS public.ia_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text,
  model text NOT NULL,
  response_time_ms integer,
  tokens_used integer,
  success boolean NOT NULL DEFAULT true,
  error_code text,
  fallback_used boolean DEFAULT false,
  retry_count integer DEFAULT 0,
  timestamp timestamptz DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ia_metrics_timestamp ON public.ia_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_ia_metrics_model ON public.ia_metrics(model);
CREATE INDEX IF NOT EXISTS idx_ia_metrics_success ON public.ia_metrics(success);

-- Enable RLS
ALTER TABLE public.ia_metrics ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role can manage ia_metrics"
  ON public.ia_metrics
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.ia_metrics IS 'Stores AI performance metrics for monitoring and optimization';