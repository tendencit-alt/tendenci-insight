
CREATE TABLE IF NOT EXISTS public.e2e_stock_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario text NOT NULL,
  expected text,
  obtained text,
  status text NOT NULL,
  bug text,
  fix text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
GRANT ALL ON public.e2e_stock_results TO service_role;
ALTER TABLE public.e2e_stock_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_e2e_stock_results" ON public.e2e_stock_results FOR ALL USING (false) WITH CHECK (false);
