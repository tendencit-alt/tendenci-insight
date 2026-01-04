-- Adicionar coluna para local de estoque independente
ALTER TABLE tendenci_ia_produtos 
ADD COLUMN IF NOT EXISTS local_estoque_id UUID REFERENCES stock_locations(id);