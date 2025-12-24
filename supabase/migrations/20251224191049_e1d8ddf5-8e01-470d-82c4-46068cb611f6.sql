-- Tabela de produtos vinculados às ordens de produção (para ficha técnica)
CREATE TABLE public.production_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cmv_total NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'rascunho',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(production_order_id)
);

-- Tabela de insumos/BOM da ficha técnica
CREATE TABLE public.production_product_bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_product_id UUID NOT NULL REFERENCES public.production_products(id) ON DELETE CASCADE,
  insumo_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  insumo_nome TEXT NOT NULL,
  quantidade NUMERIC(12,4) NOT NULL DEFAULT 1,
  unidade TEXT DEFAULT 'UN',
  custo_unitario NUMERIC(12,4) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) GENERATED ALWAYS AS (ROUND(quantidade * custo_unitario, 2)) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_production_products_order ON public.production_products(production_order_id);
CREATE INDEX idx_production_product_bom_product ON public.production_product_bom(production_product_id);
CREATE INDEX idx_production_product_bom_insumo ON public.production_product_bom(insumo_id);

-- Habilitar RLS
ALTER TABLE public.production_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_product_bom ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para production_products
CREATE POLICY "Autenticados podem ler production_products"
  ON public.production_products FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar production_products"
  ON public.production_products FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar production_products"
  ON public.production_products FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem deletar production_products"
  ON public.production_products FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Políticas RLS para production_product_bom
CREATE POLICY "Autenticados podem ler production_product_bom"
  ON public.production_product_bom FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar production_product_bom"
  ON public.production_product_bom FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar production_product_bom"
  ON public.production_product_bom FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar production_product_bom"
  ON public.production_product_bom FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Função para criar production_product automaticamente quando OP é criada
CREATE OR REPLACE FUNCTION public.create_production_product_on_order()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.production_products (production_order_id, name)
  VALUES (NEW.id, COALESCE(NEW.title, 'Produto OP #' || NEW.order_number));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar production_product automaticamente
CREATE TRIGGER trigger_create_production_product
  AFTER INSERT ON public.production_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_production_product_on_order();

-- Função para recalcular CMV total quando BOM muda
CREATE OR REPLACE FUNCTION public.update_production_product_cmv()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_new_cmv NUMERIC(12,2);
BEGIN
  -- Determina qual production_product_id foi afetado
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.production_product_id;
  ELSE
    v_product_id := NEW.production_product_id;
  END IF;

  -- Recalcula CMV total
  SELECT COALESCE(SUM(subtotal), 0) INTO v_new_cmv
  FROM public.production_product_bom
  WHERE production_product_id = v_product_id;

  -- Atualiza production_products
  UPDATE public.production_products
  SET cmv_total = v_new_cmv, updated_at = now()
  WHERE id = v_product_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para recalcular CMV
CREATE TRIGGER trigger_update_cmv
  AFTER INSERT OR UPDATE OR DELETE ON public.production_product_bom
  FOR EACH ROW
  EXECUTE FUNCTION public.update_production_product_cmv();

-- Atualizar updated_at automaticamente
CREATE TRIGGER update_production_products_updated_at
  BEFORE UPDATE ON public.production_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();