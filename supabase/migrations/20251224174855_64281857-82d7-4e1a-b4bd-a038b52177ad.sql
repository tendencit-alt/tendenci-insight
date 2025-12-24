-- Criar tabela de taxas de cartão de crédito
CREATE TABLE IF NOT EXISTS public.credit_card_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installments INTEGER NOT NULL UNIQUE,
  rate_percent NUMERIC(5,2) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir taxas padrão da Tendenci
INSERT INTO public.credit_card_rates (installments, rate_percent) VALUES
  (1, 2.80), (2, 3.95), (3, 4.69), (4, 5.41),
  (5, 6.13), (6, 6.84), (7, 7.30), (8, 8.00),
  (9, 8.90), (10, 9.38), (11, 10.05), (12, 10.72);

-- Adicionar colunas de taxa de cartão na tabela orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS taxa_cartao_percentual NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa_cartao_valor NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa_cartao_responsavel VARCHAR(20) DEFAULT 'cliente',
  ADD COLUMN IF NOT EXISTS numero_parcelas_cartao INTEGER DEFAULT 1;

-- Enable RLS na tabela credit_card_rates
ALTER TABLE public.credit_card_rates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para credit_card_rates
CREATE POLICY "Autenticados podem ler taxas de cartão"
  ON public.credit_card_rates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem gerenciar taxas de cartão"
  ON public.credit_card_rates
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_credit_card_rates_updated_at
  BEFORE UPDATE ON public.credit_card_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();