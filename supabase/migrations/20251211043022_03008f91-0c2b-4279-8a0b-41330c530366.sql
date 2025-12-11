
-- =====================================================
-- FASE 1: Expandir tabela clients com dados fiscais
-- =====================================================

-- Dados Fiscais
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(18);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tipo_pessoa VARCHAR(2) DEFAULT 'PF';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS razao_social TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nome_fantasia TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS inscricao_municipal VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS isento_ie BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contribuinte_icms BOOLEAN DEFAULT false;

-- Endereço Completo
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cep VARCHAR(10);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logradouro TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS numero VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS bairro TEXT;

-- Contato adicional
ALTER TABLE clients ADD COLUMN IF NOT EXISTS telefone_fixo VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contato_financeiro TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email_financeiro TEXT;

-- =====================================================
-- FASE 2: Criar tabela de Pedidos
-- =====================================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  
  -- Vínculo com módulos
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES crm_deals(id) ON DELETE SET NULL,
  architect_id UUID REFERENCES architects(id) ON DELETE SET NULL,
  
  -- Status do pedido
  status VARCHAR(30) DEFAULT 'rascunho',
  
  -- Vendedor
  vendedor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Datas
  data_emissao TIMESTAMPTZ DEFAULT NOW(),
  data_aprovacao TIMESTAMPTZ,
  data_entrega_prevista DATE,
  data_entrega_realizada DATE,
  
  -- Valores
  subtotal NUMERIC(15,2) DEFAULT 0,
  desconto_percentual NUMERIC(5,2) DEFAULT 0,
  desconto_valor NUMERIC(15,2) DEFAULT 0,
  valor_frete NUMERIC(15,2) DEFAULT 0,
  valor_total NUMERIC(15,2) DEFAULT 0,
  
  -- Pagamento
  forma_pagamento VARCHAR(50),
  condicao_pagamento TEXT,
  parcelas INTEGER DEFAULT 1,
  data_primeiro_vencimento DATE,
  
  -- Entrega
  tipo_entrega VARCHAR(30) DEFAULT 'entrega',
  entrega_mesmo_endereco BOOLEAN DEFAULT true,
  entrega_cep VARCHAR(10),
  entrega_logradouro TEXT,
  entrega_numero VARCHAR(20),
  entrega_complemento TEXT,
  entrega_bairro TEXT,
  entrega_cidade TEXT,
  entrega_uf VARCHAR(2),
  entrega_observacoes TEXT,
  
  -- Transportadora
  transportadora_nome TEXT,
  transportadora_cnpj VARCHAR(18),
  
  -- Observações
  observacoes_internas TEXT,
  observacoes_nf TEXT,
  
  -- Rastreabilidade
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FASE 2.2: Criar tabela de Itens do Pedido
-- =====================================================

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Produto
  descricao TEXT NOT NULL,
  codigo_produto VARCHAR(50),
  ncm VARCHAR(10),
  cfop VARCHAR(10),
  unidade VARCHAR(10) DEFAULT 'UN',
  
  -- Quantidades e valores
  quantidade NUMERIC(15,4) NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(15,2) NOT NULL DEFAULT 0,
  desconto_percentual NUMERIC(5,2) DEFAULT 0,
  desconto_valor NUMERIC(15,2) DEFAULT 0,
  valor_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  -- Detalhes
  especificacoes TEXT,
  observacoes TEXT,
  
  -- Vínculo com produção
  production_order_id UUID REFERENCES production_orders(id) ON DELETE SET NULL,
  
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FASE 2.3: Criar tabela de Histórico do Pedido
-- =====================================================

CREATE TABLE IF NOT EXISTS order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FASE 2.4: Criar tabela de Condições de Pagamento
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  parcelas INTEGER DEFAULT 1,
  dias_primeiro_vencimento INTEGER DEFAULT 30,
  intervalo_parcelas INTEGER DEFAULT 30,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir condições de pagamento padrão
INSERT INTO payment_conditions (nome, descricao, parcelas, dias_primeiro_vencimento, intervalo_parcelas) VALUES
('À Vista', 'Pagamento à vista', 1, 0, 0),
('30 dias', 'Pagamento em 30 dias', 1, 30, 0),
('30/60 dias', 'Pagamento em 2x', 2, 30, 30),
('30/60/90 dias', 'Pagamento em 3x', 3, 30, 30),
('Entrada + 30 dias', 'Entrada + 1 parcela', 2, 0, 30),
('Entrada + 30/60 dias', 'Entrada + 2 parcelas', 3, 0, 30)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Habilitar RLS
-- =====================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_conditions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Políticas RLS para orders
-- =====================================================

CREATE POLICY "Autenticados leem pedidos" ON orders
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados criam pedidos" ON orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados atualizam pedidos" ON orders
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins deletam pedidos" ON orders
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- =====================================================
-- Políticas RLS para order_items
-- =====================================================

CREATE POLICY "Autenticados leem itens" ON order_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados criam itens" ON order_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados atualizam itens" ON order_items
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados deletam itens" ON order_items
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- =====================================================
-- Políticas RLS para order_history
-- =====================================================

CREATE POLICY "Autenticados leem histórico" ON order_history
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sistema cria histórico" ON order_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- Políticas RLS para payment_conditions
-- =====================================================

CREATE POLICY "Todos leem condições pagamento" ON payment_conditions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins gerenciam condições" ON payment_conditions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- =====================================================
-- Índices para performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_deal_id ON orders(deal_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_vendedor_id ON orders(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_orders_data_emissao ON orders(data_emissao);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_history(order_id);

-- =====================================================
-- Trigger para atualizar updated_at
-- =====================================================

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Função para recalcular totais do pedido
-- =====================================================

CREATE OR REPLACE FUNCTION recalculate_order_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal NUMERIC(15,2);
  v_order_record RECORD;
  v_desconto_calc NUMERIC(15,2);
  v_total NUMERIC(15,2);
BEGIN
  -- Calcular subtotal dos itens
  SELECT COALESCE(SUM(valor_total), 0) INTO v_subtotal
  FROM order_items
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
  
  -- Buscar dados do pedido
  SELECT * INTO v_order_record
  FROM orders
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  -- Calcular desconto
  IF v_order_record.desconto_percentual > 0 THEN
    v_desconto_calc := v_subtotal * (v_order_record.desconto_percentual / 100);
  ELSE
    v_desconto_calc := COALESCE(v_order_record.desconto_valor, 0);
  END IF;
  
  -- Calcular total
  v_total := v_subtotal - v_desconto_calc + COALESCE(v_order_record.valor_frete, 0);
  
  -- Atualizar pedido
  UPDATE orders
  SET 
    subtotal = v_subtotal,
    valor_total = v_total
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger para recalcular totais
CREATE TRIGGER recalculate_order_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_order_totals();

-- =====================================================
-- Função para registrar histórico de pedidos
-- =====================================================

CREATE OR REPLACE FUNCTION log_order_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_history (order_id, action_type, field_name, old_value, new_value, description, created_by)
    VALUES (NEW.id, 'status_change', 'status', OLD.status, NEW.status, 
      'Status alterado de ' || OLD.status || ' para ' || NEW.status, auth.uid());
  END IF;
  
  -- Approval
  IF NEW.status = 'aprovado' AND OLD.status != 'aprovado' THEN
    INSERT INTO order_history (order_id, action_type, description, created_by)
    VALUES (NEW.id, 'approved', 'Pedido aprovado', auth.uid());
  END IF;
  
  -- Value change
  IF OLD.valor_total IS DISTINCT FROM NEW.valor_total THEN
    INSERT INTO order_history (order_id, action_type, field_name, old_value, new_value, description, created_by)
    VALUES (NEW.id, 'value_change', 'valor_total', OLD.valor_total::TEXT, NEW.valor_total::TEXT, 
      'Valor alterado', auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_order_changes_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_changes();

-- =====================================================
-- Função para criar pedido quando deal é ganho
-- =====================================================

CREATE OR REPLACE FUNCTION log_order_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO order_history (order_id, action_type, description, created_by)
  VALUES (NEW.id, 'created', 'Pedido #' || NEW.order_number || ' criado', NEW.created_by);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_order_creation_trigger
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_creation();

-- =====================================================
-- RPC para métricas de pedidos
-- =====================================================

CREATE OR REPLACE FUNCTION orders_metrics(
  p_status TEXT DEFAULT NULL,
  p_vendedor_id UUID DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_pedidos', COUNT(*),
    'valor_total', COALESCE(SUM(valor_total), 0),
    'ticket_medio', CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(valor_total), 0) / COUNT(*) ELSE 0 END,
    'rascunho', COUNT(*) FILTER (WHERE status = 'rascunho'),
    'aguardando_aprovacao', COUNT(*) FILTER (WHERE status = 'aguardando_aprovacao'),
    'aprovado', COUNT(*) FILTER (WHERE status = 'aprovado'),
    'em_producao', COUNT(*) FILTER (WHERE status = 'em_producao'),
    'faturado', COUNT(*) FILTER (WHERE status = 'faturado'),
    'entregue', COUNT(*) FILTER (WHERE status = 'entregue'),
    'cancelado', COUNT(*) FILTER (WHERE status = 'cancelado'),
    'valor_aprovado', COALESCE(SUM(valor_total) FILTER (WHERE status IN ('aprovado', 'em_producao', 'faturado', 'entregue')), 0),
    'valor_em_producao', COALESCE(SUM(valor_total) FILTER (WHERE status = 'em_producao'), 0)
  ) INTO result
  FROM orders
  WHERE 
    (p_status IS NULL OR status = p_status)
    AND (p_vendedor_id IS NULL OR vendedor_id = p_vendedor_id)
    AND (p_date_from IS NULL OR data_emissao >= p_date_from)
    AND (p_date_to IS NULL OR data_emissao <= p_date_to);
  
  RETURN result;
END;
$$;

-- Habilitar realtime para pedidos
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;

-- Adicionar menu item para pedidos
INSERT INTO menu_items (label, icon, route, module, position, visible)
VALUES ('Pedidos', 'ShoppingCart', '/pedidos', 'pedidos', 35, true)
ON CONFLICT DO NOTHING;
