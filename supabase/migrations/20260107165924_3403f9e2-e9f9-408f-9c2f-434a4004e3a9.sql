-- Adicionar coluna template_ficha_id na tabela tendenci_ia_produtos
ALTER TABLE public.tendenci_ia_produtos 
ADD COLUMN template_ficha_id UUID REFERENCES public.production_products(id) ON DELETE SET NULL;

-- Adicionar coluna template_ficha_id na tabela products
ALTER TABLE public.products 
ADD COLUMN template_ficha_id UUID REFERENCES public.production_products(id) ON DELETE SET NULL;

-- Criar índices para performance
CREATE INDEX idx_tendenci_ia_produtos_template_ficha ON public.tendenci_ia_produtos(template_ficha_id);
CREATE INDEX idx_products_template_ficha ON public.products(template_ficha_id);

-- Comentários
COMMENT ON COLUMN public.tendenci_ia_produtos.template_ficha_id IS 'Referência à ficha técnica padrão do produto';
COMMENT ON COLUMN public.products.template_ficha_id IS 'Referência à ficha técnica padrão do item de estoque';