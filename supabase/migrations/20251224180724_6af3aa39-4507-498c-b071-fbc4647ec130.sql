-- Criar tabela de taxas de boleto
CREATE TABLE public.boleto_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carencia_dias INTEGER NOT NULL,
  installments INTEGER NOT NULL,
  rate_percent NUMERIC(5,2) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(carencia_dias, installments)
);

-- Habilitar RLS
ALTER TABLE public.boleto_rates ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (taxas são informação pública)
CREATE POLICY "Taxas de boleto são públicas para leitura"
ON public.boleto_rates
FOR SELECT
USING (true);

-- Inserir taxas para carência 30 dias
INSERT INTO public.boleto_rates (carencia_dias, installments, rate_percent) VALUES
  (30, 1, 2.62), (30, 2, 3.89), (30, 3, 5.15), (30, 4, 6.38),
  (30, 5, 7.59), (30, 6, 8.78), (30, 7, 9.43), (30, 8, 10.53),
  (30, 9, 11.60), (30, 10, 12.66), (30, 11, 13.70), (30, 12, 14.73);

-- Inserir taxas para carência 60 dias
INSERT INTO public.boleto_rates (carencia_dias, installments, rate_percent) VALUES
  (60, 1, 5.17), (60, 2, 6.41), (60, 3, 7.63), (60, 4, 8.83),
  (60, 5, 10.01), (60, 6, 11.17), (60, 7, 11.68), (60, 8, 12.74),
  (60, 9, 13.79), (60, 10, 14.82), (60, 11, 15.84), (60, 12, 16.84);

-- Adicionar colunas de taxa de boleto na tabela orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS taxa_boleto_percentual NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS taxa_boleto_valor NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS taxa_boleto_responsavel VARCHAR(20) DEFAULT 'cliente',
ADD COLUMN IF NOT EXISTS numero_parcelas_boleto INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS carencia_boleto INTEGER DEFAULT 30;