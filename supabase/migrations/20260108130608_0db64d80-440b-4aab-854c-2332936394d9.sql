-- Create table to log IA processing failures for analysis
CREATE TABLE IF NOT EXISTS public.ia_processing_failures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number text,
  instance_name text,
  user_message text,
  ai_response text,
  error_type text,
  model_used text,
  prompt_size integer,
  history_size integer,
  created_at timestamptz DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE public.ia_processing_failures IS 'Logs AI processing failures for debugging and analysis';

-- Enable RLS
ALTER TABLE public.ia_processing_failures ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role)
CREATE POLICY "Service role has full access to ia_processing_failures"
ON public.ia_processing_failures
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for efficient querying by date
CREATE INDEX idx_ia_processing_failures_created_at ON public.ia_processing_failures(created_at DESC);