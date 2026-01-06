-- Adicionar colunas de comissão na tabela orders

-- Comissão Vendedor
ALTER TABLE orders ADD COLUMN IF NOT EXISTS comissao_vendedor_percentual NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS comissao_vendedor_valor NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS comissao_vendedor_responsavel_id UUID REFERENCES profiles(id);

-- Comissão Orçamentista
ALTER TABLE orders ADD COLUMN IF NOT EXISTS comissao_orcamentista_percentual NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS comissao_orcamentista_valor NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS comissao_orcamentista_responsavel_id UUID REFERENCES profiles(id);

-- Comissão Projetista
ALTER TABLE orders ADD COLUMN IF NOT EXISTS comissao_projetista_percentual NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS comissao_projetista_valor NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS comissao_projetista_responsavel_id UUID REFERENCES profiles(id);