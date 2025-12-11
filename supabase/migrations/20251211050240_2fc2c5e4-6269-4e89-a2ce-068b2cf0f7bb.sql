
-- =====================================================
-- MÓDULO COMPLETO DE ESTOQUE E FORNECEDORES
-- =====================================================

-- 1. CATEGORIAS DE PRODUTOS
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'bg-gray-500',
  position INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem categorias" ON public.product_categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins gerenciam categorias" ON public.product_categories FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. LOCAIS DE ESTOQUE
CREATE TABLE public.stock_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.stock_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem locais" ON public.stock_locations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins gerenciam locais" ON public.stock_locations FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. PRODUTOS
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  unit VARCHAR(10) DEFAULT 'UN',
  current_stock NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 0,
  max_stock NUMERIC,
  cost_price NUMERIC DEFAULT 0,
  sale_price NUMERIC DEFAULT 0,
  ncm VARCHAR(10),
  cfop_entrada VARCHAR(4),
  cfop_saida VARCHAR(4),
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem produtos" ON public.products FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados criam produtos" ON public.products FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam produtos" ON public.products FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins deletam produtos" ON public.products FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. FORNECEDORES
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trade_name TEXT,
  cpf_cnpj VARCHAR(20),
  inscricao_estadual VARCHAR(20),
  phone TEXT,
  email TEXT,
  website TEXT,
  cep VARCHAR(10),
  logradouro TEXT,
  numero VARCHAR(20),
  complemento TEXT,
  bairro TEXT,
  city TEXT,
  state VARCHAR(2),
  payment_terms TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem fornecedores" ON public.suppliers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados criam fornecedores" ON public.suppliers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam fornecedores" ON public.suppliers FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins deletam fornecedores" ON public.suppliers FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. CONTATOS DO FORNECEDOR
CREATE TABLE public.supplier_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem contatos" ON public.supplier_contacts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados gerenciam contatos" ON public.supplier_contacts FOR ALL USING (auth.uid() IS NOT NULL);

-- 6. FORNECEDORES POR PRODUTO
CREATE TABLE public.product_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  supplier_code TEXT,
  cost_price NUMERIC,
  lead_time_days INTEGER,
  min_order_quantity NUMERIC DEFAULT 1,
  is_preferred BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, supplier_id)
);

ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem product_suppliers" ON public.product_suppliers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados gerenciam product_suppliers" ON public.product_suppliers FOR ALL USING (auth.uid() IS NOT NULL);

-- 7. PEDIDOS DE COMPRA
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number SERIAL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  status TEXT DEFAULT 'rascunho',
  issue_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expected_date TIMESTAMP WITH TIME ZONE,
  received_date TIMESTAMP WITH TIME ZONE,
  subtotal NUMERIC DEFAULT 0,
  discount_value NUMERIC DEFAULT 0,
  shipping_cost NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  payment_terms TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem pedidos compra" ON public.purchase_orders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados criam pedidos compra" ON public.purchase_orders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam pedidos compra" ON public.purchase_orders FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins deletam pedidos compra" ON public.purchase_orders FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 8. ITENS DO PEDIDO DE COMPRA
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity NUMERIC NOT NULL,
  received_quantity NUMERIC DEFAULT 0,
  unit_price NUMERIC NOT NULL,
  discount_percent NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem itens compra" ON public.purchase_order_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados gerenciam itens compra" ON public.purchase_order_items FOR ALL USING (auth.uid() IS NOT NULL);

-- 9. MOVIMENTAÇÕES DE ESTOQUE
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  previous_stock NUMERIC,
  new_stock NUMERIC,
  unit_cost NUMERIC,
  reference_type TEXT,
  reference_id UUID,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem movimentações" ON public.stock_movements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados criam movimentações" ON public.stock_movements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- TRIGGERS E FUNÇÕES
-- =====================================================

-- Função para atualizar estoque atual do produto
CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS trigger AS $$
BEGIN
  -- Registrar estoque anterior
  NEW.previous_stock := (SELECT current_stock FROM products WHERE id = NEW.product_id);
  
  -- Calcular novo estoque baseado no tipo de movimento
  IF NEW.movement_type IN ('entrada', 'producao_saida', 'ajuste_positivo') THEN
    NEW.new_stock := NEW.previous_stock + NEW.quantity;
  ELSIF NEW.movement_type IN ('saida', 'producao_consumo', 'ajuste_negativo') THEN
    NEW.new_stock := NEW.previous_stock - NEW.quantity;
  ELSE
    NEW.new_stock := NEW.previous_stock;
  END IF;
  
  -- Atualizar estoque do produto
  UPDATE products SET current_stock = NEW.new_stock, updated_at = now() WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_product_stock
BEFORE INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- Trigger para recalcular total do pedido de compra
CREATE OR REPLACE FUNCTION public.recalculate_purchase_order_totals()
RETURNS trigger AS $$
DECLARE
  v_subtotal NUMERIC;
  v_order_record RECORD;
BEGIN
  SELECT COALESCE(SUM(total), 0) INTO v_subtotal
  FROM purchase_order_items
  WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  
  SELECT * INTO v_order_record
  FROM purchase_orders
  WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  
  UPDATE purchase_orders
  SET 
    subtotal = v_subtotal,
    total = v_subtotal - COALESCE(discount_value, 0) + COALESCE(shipping_cost, 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_recalculate_purchase_totals
AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
FOR EACH ROW EXECUTE FUNCTION recalculate_purchase_order_totals();

-- Trigger updated_at para products
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger updated_at para suppliers
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON suppliers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger updated_at para purchase_orders
CREATE TRIGGER update_purchase_orders_updated_at
BEFORE UPDATE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RPCs PARA MÉTRICAS
-- =====================================================

-- Métricas de Estoque
CREATE OR REPLACE FUNCTION public.inventory_metrics()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_products', (SELECT COUNT(*) FROM products WHERE active = true),
    'total_stock_value', (SELECT COALESCE(SUM(current_stock * cost_price), 0) FROM products WHERE active = true),
    'low_stock_count', (SELECT COUNT(*) FROM products WHERE active = true AND current_stock <= min_stock AND min_stock > 0),
    'out_of_stock_count', (SELECT COUNT(*) FROM products WHERE active = true AND current_stock <= 0),
    'entries_this_month', (SELECT COALESCE(SUM(quantity), 0) FROM stock_movements WHERE movement_type IN ('entrada', 'producao_saida') AND created_at >= date_trunc('month', CURRENT_DATE)),
    'exits_this_month', (SELECT COALESCE(SUM(quantity), 0) FROM stock_movements WHERE movement_type IN ('saida', 'producao_consumo') AND created_at >= date_trunc('month', CURRENT_DATE))
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Métricas de Fornecedores
CREATE OR REPLACE FUNCTION public.suppliers_metrics()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_suppliers', (SELECT COUNT(*) FROM suppliers WHERE active = true),
    'purchases_this_month', (SELECT COUNT(*) FROM purchase_orders WHERE created_at >= date_trunc('month', CURRENT_DATE)),
    'purchases_value_this_month', (SELECT COALESCE(SUM(total), 0) FROM purchase_orders WHERE created_at >= date_trunc('month', CURRENT_DATE) AND status != 'cancelado'),
    'pending_orders', (SELECT COUNT(*) FROM purchase_orders WHERE status IN ('enviado', 'confirmado', 'parcial'))
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Métricas de Compras
CREATE OR REPLACE FUNCTION public.purchases_metrics()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'draft_orders', (SELECT COUNT(*) FROM purchase_orders WHERE status = 'rascunho'),
    'pending_orders', (SELECT COUNT(*) FROM purchase_orders WHERE status IN ('enviado', 'confirmado', 'parcial')),
    'received_this_month', (SELECT COUNT(*) FROM purchase_orders WHERE status = 'recebido' AND received_date >= date_trunc('month', CURRENT_DATE)),
    'pending_value', (SELECT COALESCE(SUM(total), 0) FROM purchase_orders WHERE status IN ('enviado', 'confirmado', 'parcial')),
    'received_value_this_month', (SELECT COALESCE(SUM(total), 0) FROM purchase_orders WHERE status = 'recebido' AND received_date >= date_trunc('month', CURRENT_DATE))
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Produtos com estoque baixo
CREATE OR REPLACE FUNCTION public.low_stock_products()
RETURNS TABLE (
  id UUID,
  code TEXT,
  name TEXT,
  current_stock NUMERIC,
  min_stock NUMERIC,
  category_name TEXT,
  location_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.code,
    p.name,
    p.current_stock,
    p.min_stock,
    pc.name as category_name,
    sl.name as location_name
  FROM products p
  LEFT JOIN product_categories pc ON pc.id = p.category_id
  LEFT JOIN stock_locations sl ON sl.id = p.location_id
  WHERE p.active = true 
    AND p.min_stock > 0 
    AND p.current_stock <= p.min_stock
  ORDER BY (p.current_stock - p.min_stock) ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- ADICIONAR MÓDULOS AO ENUM DE PERMISSÕES
-- =====================================================

ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'fornecedores';
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'estoque';
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'compras';

-- =====================================================
-- INSERIR DADOS INICIAIS
-- =====================================================

-- Categoria padrão
INSERT INTO product_categories (name, description, color, position) VALUES
('Geral', 'Categoria padrão para produtos', 'bg-gray-500', 0);

-- Local padrão
INSERT INTO stock_locations (name, is_default) VALUES
('Depósito Principal', true);

-- Inserir itens de menu
INSERT INTO menu_items (label, icon, route, module, position, visible) VALUES
('Fornecedores', 'Truck', '/fornecedores', 'fornecedores', 8, true),
('Estoque', 'Package', '/estoque', 'estoque', 9, true),
('Compras', 'ShoppingCart', '/compras', 'compras', 10, true);
