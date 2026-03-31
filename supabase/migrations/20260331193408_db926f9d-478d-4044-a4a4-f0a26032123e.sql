-- Create fee supplier config table
CREATE TABLE public.fee_supplier_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_type text NOT NULL UNIQUE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fee_supplier_configs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage
CREATE POLICY "Authenticated users can manage fee_supplier_configs"
  ON public.fee_supplier_configs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed with empty configs for each fee type
INSERT INTO public.fee_supplier_configs (fee_type) VALUES
  ('cartao_credito'),
  ('cartao_debito'),
  ('boleto'),
  ('link_pagamento');
