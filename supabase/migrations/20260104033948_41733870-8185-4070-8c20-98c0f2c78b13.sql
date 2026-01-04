-- Adicionar campo de preço original para mostrar desconto
ALTER TABLE tendenci_ia_produtos 
ADD COLUMN preco_original numeric DEFAULT NULL;

COMMENT ON COLUMN tendenci_ia_produtos.preco_original IS 'Preço original (DE) para mostrar desconto ao cliente';