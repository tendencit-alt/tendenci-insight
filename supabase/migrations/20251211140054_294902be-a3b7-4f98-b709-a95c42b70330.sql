-- Função que cria pedido automaticamente quando deal é marcado como ganho
CREATE OR REPLACE FUNCTION public.create_order_on_deal_won()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
  v_order_exists BOOLEAN;
BEGIN
  -- Apenas quando status muda para 'won'
  IF NEW.status = 'won' AND (OLD.status IS NULL OR OLD.status != 'won') THEN
    
    -- Verificar se já existe pedido para este deal
    SELECT EXISTS (SELECT 1 FROM orders WHERE deal_id = NEW.id) INTO v_order_exists;
    
    IF NOT v_order_exists THEN
      -- Buscar client_id do lead
      IF NEW.lead_id IS NOT NULL THEN
        SELECT client_id INTO v_client_id
        FROM leads
        WHERE id = NEW.lead_id;
      END IF;
      
      -- Criar pedido somente se houver cliente
      IF v_client_id IS NOT NULL THEN
        INSERT INTO orders (
          client_id,
          deal_id,
          architect_id,
          vendedor_id,
          created_by,
          valor_total,
          subtotal,
          status
        ) VALUES (
          v_client_id,
          NEW.id,
          NEW.architect_id,
          NEW.owner_id,
          NEW.owner_id,
          COALESCE(NEW.value, 0),
          COALESCE(NEW.value, 0),
          'rascunho'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para executar após update em crm_deals
DROP TRIGGER IF EXISTS trigger_create_order_on_deal_won ON crm_deals;
CREATE TRIGGER trigger_create_order_on_deal_won
AFTER UPDATE ON crm_deals
FOR EACH ROW
EXECUTE FUNCTION public.create_order_on_deal_won();

-- Migrar pedidos retroativos para deals ganhos que não têm pedido
INSERT INTO orders (client_id, deal_id, architect_id, vendedor_id, created_by, valor_total, subtotal, status)
SELECT 
  l.client_id,
  d.id,
  d.architect_id,
  d.owner_id,
  d.owner_id,
  COALESCE(d.value, 0),
  COALESCE(d.value, 0),
  'rascunho'
FROM crm_deals d
JOIN leads l ON d.lead_id = l.id
WHERE d.status = 'won'
  AND l.client_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.deal_id = d.id);