
-- =====================================================
-- FASE 1: NOVOS CAMPOS NA TABELA PRODUCTS
-- =====================================================

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS reserved_stock numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS reorder_point numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS reorder_quantity numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS barcode text,
ADD COLUMN IF NOT EXISTS average_cost numeric DEFAULT 0;

-- Índice para barcode
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

-- =====================================================
-- FASE 2: TABELA BILL OF MATERIALS (BOM)
-- =====================================================

CREATE TABLE IF NOT EXISTS product_bom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'UN',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_bom_component UNIQUE (product_id, component_id),
  CONSTRAINT check_different_products CHECK (product_id != component_id)
);

ALTER TABLE product_bom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem BOM" ON product_bom FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados criam BOM" ON product_bom FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam BOM" ON product_bom FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados deletam BOM" ON product_bom FOR DELETE USING (auth.uid() IS NOT NULL);

-- =====================================================
-- FASE 3: HISTÓRICO DE PREÇOS/CUSTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS product_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  cost_price numeric NOT NULL,
  quantity numeric NOT NULL,
  total_value numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem histórico preços" ON product_price_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Sistema cria histórico preços" ON product_price_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_price_history_product ON product_price_history(product_id);
CREATE INDEX idx_price_history_date ON product_price_history(created_at DESC);

-- =====================================================
-- FASE 4: CONFIGURAÇÃO DE ALERTAS DE ESTOQUE
-- =====================================================

CREATE TABLE IF NOT EXISTS stock_alerts_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  alert_low_stock boolean DEFAULT true,
  alert_zero_stock boolean DEFAULT true,
  alert_high_stock boolean DEFAULT false,
  high_stock_threshold numeric,
  notify_user_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE stock_alerts_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gerenciam alertas" ON stock_alerts_config FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- FASE 5: TRIGGER - CUSTO MÉDIO PONDERADO
-- =====================================================

CREATE OR REPLACE FUNCTION update_product_average_cost()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stock numeric;
  v_current_avg_cost numeric;
  v_new_avg_cost numeric;
BEGIN
  -- Apenas processar entradas de estoque
  IF NEW.movement_type IN ('entrada', 'ajuste_positivo') AND NEW.unit_cost IS NOT NULL AND NEW.unit_cost > 0 THEN
    -- Buscar estoque e custo médio atual
    SELECT current_stock, COALESCE(average_cost, 0)
    INTO v_current_stock, v_current_avg_cost
    FROM products WHERE id = NEW.product_id;
    
    -- Calcular novo custo médio ponderado
    -- Fórmula: (estoque_atual * custo_medio_atual + qtd_entrada * custo_entrada) / (estoque_atual + qtd_entrada)
    IF (v_current_stock + NEW.quantity) > 0 THEN
      v_new_avg_cost := ((v_current_stock * v_current_avg_cost) + (NEW.quantity * NEW.unit_cost)) / (v_current_stock + NEW.quantity);
      
      UPDATE products 
      SET average_cost = v_new_avg_cost,
          cost_price = NEW.unit_cost -- Atualiza também o último custo
      WHERE id = NEW.product_id;
    END IF;
    
    -- Registrar no histórico de preços
    INSERT INTO product_price_history (product_id, supplier_id, cost_price, quantity, total_value)
    VALUES (NEW.product_id, NEW.supplier_id, NEW.unit_cost, NEW.quantity, NEW.quantity * NEW.unit_cost);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_update_average_cost ON stock_movements;
CREATE TRIGGER trg_update_average_cost
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_product_average_cost();

-- =====================================================
-- FASE 6: TRIGGER - BAIXA AUTOMÁTICA AO FATURAR PEDIDO
-- =====================================================

CREATE OR REPLACE FUNCTION process_order_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
  v_product RECORD;
BEGIN
  -- Apenas processar quando status muda para 'faturado'
  IF NEW.status = 'faturado' AND (OLD.status IS NULL OR OLD.status != 'faturado') THEN
    -- Iterar sobre os itens do pedido
    FOR v_item IN 
      SELECT oi.*, p.name as product_name, p.current_stock
      FROM order_items oi
      JOIN products p ON p.code = oi.codigo_produto OR p.name = oi.descricao
      WHERE oi.order_id = NEW.id
    LOOP
      -- Criar movimento de saída para cada item
      INSERT INTO stock_movements (
        product_id,
        movement_type,
        quantity,
        unit_cost,
        reference_type,
        reference_id,
        notes,
        created_by
      ) VALUES (
        (SELECT id FROM products WHERE code = v_item.codigo_produto OR name = v_item.descricao LIMIT 1),
        'saida',
        v_item.quantidade,
        v_item.valor_unitario,
        'order',
        NEW.id,
        'Baixa automática - Pedido #' || NEW.order_number,
        NEW.approved_by
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_order_stock_movement ON orders;
CREATE TRIGGER trg_order_stock_movement
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION process_order_stock_movement();

-- =====================================================
-- FASE 7: TRIGGER - CONSUMO NA PRODUÇÃO
-- =====================================================

CREATE OR REPLACE FUNCTION process_production_stock_consumption()
RETURNS TRIGGER AS $$
DECLARE
  v_bom RECORD;
BEGIN
  -- Quando ordem de produção inicia (status muda para 'em_producao')
  IF NEW.status = 'em_producao' AND (OLD.status IS NULL OR OLD.status != 'em_producao') THEN
    -- Buscar BOM do produto sendo produzido e consumir componentes
    FOR v_bom IN 
      SELECT pb.*, p.name as component_name
      FROM product_bom pb
      JOIN products p ON p.id = pb.component_id
      WHERE pb.product_id = (
        SELECT p.id FROM products p 
        JOIN order_items oi ON oi.production_order_id = NEW.id
        WHERE oi.codigo_produto = p.code OR oi.descricao = p.name
        LIMIT 1
      )
    LOOP
      INSERT INTO stock_movements (
        product_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        created_by
      ) VALUES (
        v_bom.component_id,
        'producao_consumo',
        v_bom.quantity,
        'production_order',
        NEW.id,
        'Consumo produção - OP #' || NEW.order_number || ' - ' || v_bom.component_name,
        NEW.responsible_id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_production_stock_consumption ON production_orders;
CREATE TRIGGER trg_production_stock_consumption
  AFTER UPDATE ON production_orders
  FOR EACH ROW
  EXECUTE FUNCTION process_production_stock_consumption();

-- =====================================================
-- FASE 8: RPC - SUGESTÃO AUTOMÁTICA DE COMPRAS
-- =====================================================

CREATE OR REPLACE FUNCTION suggest_purchase_orders()
RETURNS TABLE (
  product_id uuid,
  product_name text,
  product_code text,
  current_stock numeric,
  reserved_stock numeric,
  available_stock numeric,
  reorder_point numeric,
  reorder_quantity numeric,
  suggested_quantity numeric,
  preferred_supplier_id uuid,
  preferred_supplier_name text,
  last_cost numeric,
  estimated_total numeric,
  urgency text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.code as product_code,
    COALESCE(p.current_stock, 0) as current_stock,
    COALESCE(p.reserved_stock, 0) as reserved_stock,
    COALESCE(p.current_stock, 0) - COALESCE(p.reserved_stock, 0) as available_stock,
    COALESCE(p.reorder_point, p.min_stock, 0) as reorder_point,
    COALESCE(p.reorder_quantity, p.min_stock * 2, 10) as reorder_quantity,
    GREATEST(
      COALESCE(p.reorder_quantity, p.min_stock * 2, 10),
      COALESCE(p.reorder_point, p.min_stock, 0) - (COALESCE(p.current_stock, 0) - COALESCE(p.reserved_stock, 0))
    ) as suggested_quantity,
    ps.supplier_id as preferred_supplier_id,
    s.name as preferred_supplier_name,
    COALESCE(ps.cost_price, p.cost_price, 0) as last_cost,
    GREATEST(
      COALESCE(p.reorder_quantity, p.min_stock * 2, 10),
      COALESCE(p.reorder_point, p.min_stock, 0) - (COALESCE(p.current_stock, 0) - COALESCE(p.reserved_stock, 0))
    ) * COALESCE(ps.cost_price, p.cost_price, 0) as estimated_total,
    CASE 
      WHEN (COALESCE(p.current_stock, 0) - COALESCE(p.reserved_stock, 0)) <= 0 THEN 'critico'
      WHEN (COALESCE(p.current_stock, 0) - COALESCE(p.reserved_stock, 0)) <= COALESCE(p.min_stock, 0) THEN 'urgente'
      WHEN (COALESCE(p.current_stock, 0) - COALESCE(p.reserved_stock, 0)) <= COALESCE(p.reorder_point, p.min_stock * 1.5, 0) THEN 'normal'
      ELSE 'baixa'
    END as urgency
  FROM products p
  LEFT JOIN product_suppliers ps ON ps.product_id = p.id AND ps.is_preferred = true
  LEFT JOIN suppliers s ON s.id = ps.supplier_id
  WHERE p.active = true
    AND (COALESCE(p.current_stock, 0) - COALESCE(p.reserved_stock, 0)) <= COALESCE(p.reorder_point, p.min_stock, 0)
  ORDER BY 
    CASE 
      WHEN (COALESCE(p.current_stock, 0) - COALESCE(p.reserved_stock, 0)) <= 0 THEN 1
      WHEN (COALESCE(p.current_stock, 0) - COALESCE(p.reserved_stock, 0)) <= COALESCE(p.min_stock, 0) THEN 2
      ELSE 3
    END,
    p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- FASE 9: RPC - MÉTRICAS AVANÇADAS DE ESTOQUE
-- =====================================================

CREATE OR REPLACE FUNCTION inventory_metrics_advanced(
  p_date_from timestamptz DEFAULT NOW() - INTERVAL '30 days',
  p_date_to timestamptz DEFAULT NOW()
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    -- Métricas gerais
    'total_products', (SELECT COUNT(*) FROM products WHERE active = true),
    'total_stock_value', (SELECT COALESCE(SUM(current_stock * COALESCE(average_cost, cost_price, 0)), 0) FROM products WHERE active = true),
    'products_below_minimum', (SELECT COUNT(*) FROM products WHERE active = true AND current_stock <= min_stock),
    'products_zero_stock', (SELECT COUNT(*) FROM products WHERE active = true AND current_stock = 0),
    'products_above_maximum', (SELECT COUNT(*) FROM products WHERE active = true AND max_stock IS NOT NULL AND current_stock > max_stock),
    
    -- Movimentações do período
    'total_entries', (SELECT COALESCE(SUM(quantity), 0) FROM stock_movements WHERE movement_type IN ('entrada', 'ajuste_positivo', 'producao_saida') AND created_at BETWEEN p_date_from AND p_date_to),
    'total_exits', (SELECT COALESCE(SUM(quantity), 0) FROM stock_movements WHERE movement_type IN ('saida', 'ajuste_negativo', 'producao_consumo') AND created_at BETWEEN p_date_from AND p_date_to),
    'entries_value', (SELECT COALESCE(SUM(quantity * COALESCE(unit_cost, 0)), 0) FROM stock_movements WHERE movement_type IN ('entrada', 'ajuste_positivo') AND created_at BETWEEN p_date_from AND p_date_to),
    'exits_value', (SELECT COALESCE(SUM(quantity * COALESCE(unit_cost, 0)), 0) FROM stock_movements WHERE movement_type IN ('saida', 'producao_consumo') AND created_at BETWEEN p_date_from AND p_date_to),
    
    -- Giro de estoque (simplificado)
    'average_turnover_days', (
      SELECT COALESCE(
        AVG(
          CASE 
            WHEN saidas.total_saidas > 0 AND p.current_stock > 0 
            THEN (p.current_stock / (saidas.total_saidas / EXTRACT(days FROM p_date_to - p_date_from)))
            ELSE NULL 
          END
        ), 0
      )
      FROM products p
      LEFT JOIN (
        SELECT product_id, SUM(quantity) as total_saidas
        FROM stock_movements 
        WHERE movement_type IN ('saida', 'producao_consumo')
          AND created_at BETWEEN p_date_from AND p_date_to
        GROUP BY product_id
      ) saidas ON saidas.product_id = p.id
      WHERE p.active = true
    ),
    
    -- Top 5 produtos mais movimentados
    'top_products_movements', (
      SELECT COALESCE(json_agg(top_mov), '[]'::json)
      FROM (
        SELECT p.name, p.code, COUNT(sm.id) as movements, SUM(sm.quantity) as total_quantity
        FROM stock_movements sm
        JOIN products p ON p.id = sm.product_id
        WHERE sm.created_at BETWEEN p_date_from AND p_date_to
        GROUP BY p.id, p.name, p.code
        ORDER BY COUNT(sm.id) DESC
        LIMIT 5
      ) top_mov
    ),
    
    -- Movimentações por tipo
    'movements_by_type', (
      SELECT COALESCE(json_agg(mov_type), '[]'::json)
      FROM (
        SELECT movement_type, COUNT(*) as count, SUM(quantity) as total_quantity
        FROM stock_movements
        WHERE created_at BETWEEN p_date_from AND p_date_to
        GROUP BY movement_type
        ORDER BY COUNT(*) DESC
      ) mov_type
    ),
    
    -- Produtos para reposição
    'products_to_reorder', (SELECT COUNT(*) FROM products WHERE active = true AND current_stock <= COALESCE(reorder_point, min_stock)),
    
    -- Valor estimado de reposição
    'reorder_estimated_value', (
      SELECT COALESCE(SUM(
        GREATEST(COALESCE(reorder_quantity, min_stock, 10), COALESCE(reorder_point, min_stock, 0) - current_stock) 
        * COALESCE(cost_price, 0)
      ), 0)
      FROM products 
      WHERE active = true AND current_stock <= COALESCE(reorder_point, min_stock)
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- FASE 10: RPC - CURVA ABC DE ESTOQUE
-- =====================================================

CREATE OR REPLACE FUNCTION stock_abc_analysis()
RETURNS TABLE (
  product_id uuid,
  product_name text,
  product_code text,
  stock_value numeric,
  cumulative_percentage numeric,
  abc_class text
) AS $$
DECLARE
  v_total_value numeric;
BEGIN
  -- Calcular valor total do estoque
  SELECT COALESCE(SUM(current_stock * COALESCE(average_cost, cost_price, 0)), 0)
  INTO v_total_value
  FROM products WHERE active = true;
  
  IF v_total_value = 0 THEN
    v_total_value := 1; -- Evitar divisão por zero
  END IF;
  
  RETURN QUERY
  WITH ranked_products AS (
    SELECT 
      p.id,
      p.name,
      p.code,
      (p.current_stock * COALESCE(p.average_cost, p.cost_price, 0)) as value,
      SUM(p.current_stock * COALESCE(p.average_cost, p.cost_price, 0)) 
        OVER (ORDER BY (p.current_stock * COALESCE(p.average_cost, p.cost_price, 0)) DESC) as cumulative
    FROM products p
    WHERE p.active = true AND p.current_stock > 0
    ORDER BY value DESC
  )
  SELECT 
    rp.id as product_id,
    rp.name as product_name,
    rp.code as product_code,
    rp.value as stock_value,
    (rp.cumulative / v_total_value * 100)::numeric as cumulative_percentage,
    CASE 
      WHEN (rp.cumulative / v_total_value * 100) <= 80 THEN 'A'
      WHEN (rp.cumulative / v_total_value * 100) <= 95 THEN 'B'
      ELSE 'C'
    END as abc_class
  FROM ranked_products rp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- FASE 11: ADICIONAR CAMPOS FALTANTES EM STOCK_MOVEMENTS
-- =====================================================

ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS reference_type text,
ADD COLUMN IF NOT EXISTS reference_id uuid;

-- Índice para referências
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
