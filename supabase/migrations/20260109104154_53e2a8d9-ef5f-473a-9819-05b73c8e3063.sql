-- Adicionar campo codigo_interno para identificação do produto
ALTER TABLE public.tendenci_ia_produtos
ADD COLUMN codigo_interno TEXT;