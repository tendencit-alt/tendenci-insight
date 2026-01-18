-- Criar tabela de subcategorias para permitir cadastro flexível
CREATE TABLE IF NOT EXISTS public.product_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar campo sub_categoria na tabela de produtos da IA
ALTER TABLE public.tendenci_ia_produtos
ADD COLUMN IF NOT EXISTS sub_categoria TEXT;

-- Habilitar RLS
ALTER TABLE public.product_subcategories ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para subcategorias (mesmo padrão de product_categories)
CREATE POLICY "Subcategorias visíveis para usuários autenticados"
  ON public.product_subcategories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Subcategorias podem ser criadas por usuários autenticados"
  ON public.product_subcategories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Subcategorias podem ser atualizadas por usuários autenticados"
  ON public.product_subcategories
  FOR UPDATE
  TO authenticated
  USING (true);

-- Inserir subcategorias iniciais
INSERT INTO public.product_subcategories (name) VALUES
  ('Mesa'),
  ('Cadeiras'),
  ('Tapete'),
  ('Sofá'),
  ('Armário'),
  ('Estante')
ON CONFLICT (name) DO NOTHING;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_tendenci_ia_produtos_sub_categoria ON public.tendenci_ia_produtos(sub_categoria);