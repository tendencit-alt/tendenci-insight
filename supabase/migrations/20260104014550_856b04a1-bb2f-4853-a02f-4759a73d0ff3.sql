-- Adicionar campos de estoque na tabela de produtos IA
ALTER TABLE tendenci_ia_produtos 
ADD COLUMN IF NOT EXISTS estoque integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS permite_venda_sem_estoque boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS prazo_entrega_dias integer DEFAULT null;