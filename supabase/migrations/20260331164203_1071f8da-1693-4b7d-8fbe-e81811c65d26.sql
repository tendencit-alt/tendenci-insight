CREATE TABLE public.payment_link_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installments INTEGER NOT NULL,
  rate_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(installments)
);

ALTER TABLE public.payment_link_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payment_link_rates"
  ON public.payment_link_rates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update payment_link_rates"
  ON public.payment_link_rates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.payment_link_rates (installments, rate_percent) VALUES
  (1, 0), (2, 0), (3, 0), (4, 0), (5, 0), (6, 0),
  (7, 0), (8, 0), (9, 0), (10, 0), (11, 0), (12, 0);