-- 1. Adicionar coluna de vínculo na tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS ia_produto_id UUID REFERENCES tendenci_ia_produtos(id);
CREATE INDEX IF NOT EXISTS idx_products_ia_produto_id ON products(ia_produto_id);

-- 2. Criar função de sincronização
CREATE OR REPLACE FUNCTION sync_ia_product_to_inventory(p_ia_produto_id UUID)
RETURNS UUID AS $$
DECLARE
  v_ia_produto RECORD;
  v_product_id UUID;
  v_code TEXT;
  v_next_num INT;
BEGIN
  -- Buscar produto da IA
  SELECT * INTO v_ia_produto 
  FROM tendenci_ia_produtos 
  WHERE id = p_ia_produto_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Não sincronizar produtos sem estoque obrigatório
  IF v_ia_produto.permite_venda_sem_estoque = true THEN
    RETURN NULL;
  END IF;
  
  -- Verificar se já existe vínculo
  SELECT id INTO v_product_id 
  FROM products 
  WHERE ia_produto_id = p_ia_produto_id;
  
  IF FOUND THEN
    -- Atualizar produto existente
    UPDATE products SET
      name = v_ia_produto.nome,
      description = v_ia_produto.descricao,
      sale_price = v_ia_produto.preco_base,
      image_url = v_ia_produto.imagem_url,
      active = v_ia_produto.ativo,
      updated_at = now()
    WHERE id = v_product_id;
  ELSE
    -- Gerar código único (IA-001, IA-002, etc)
    SELECT COALESCE(MAX(
      CASE 
        WHEN code ~ '^IA-[0-9]+$' THEN SUBSTRING(code FROM 4)::INT 
        ELSE 0 
      END
    ), 0) + 1 INTO v_next_num
    FROM products
    WHERE code LIKE 'IA-%';
    
    v_code := 'IA-' || LPAD(v_next_num::TEXT, 3, '0');
    
    -- Criar novo produto
    INSERT INTO products (
      code, name, description, sale_price, image_url, 
      ia_produto_id, unit, current_stock, active
    ) VALUES (
      v_code,
      v_ia_produto.nome,
      v_ia_produto.descricao,
      v_ia_produto.preco_base,
      v_ia_produto.imagem_url,
      p_ia_produto_id,
      'UN',
      COALESCE(v_ia_produto.estoque, 0),
      v_ia_produto.ativo
    )
    RETURNING id INTO v_product_id;
    
    -- Atualizar vínculo reverso na tabela IA
    UPDATE tendenci_ia_produtos 
    SET inventory_product_id = v_product_id 
    WHERE id = p_ia_produto_id;
  END IF;
  
  RETURN v_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar trigger automático
CREATE OR REPLACE FUNCTION trigger_sync_ia_to_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas sincronizar se não for produto sem estoque
  IF NEW.permite_venda_sem_estoque = false OR NEW.permite_venda_sem_estoque IS NULL THEN
    PERFORM sync_ia_product_to_inventory(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_ia_produto_after_insert_update ON tendenci_ia_produtos;
CREATE TRIGGER trg_sync_ia_produto_after_insert_update
AFTER INSERT OR UPDATE ON tendenci_ia_produtos
FOR EACH ROW EXECUTE FUNCTION trigger_sync_ia_to_inventory();

-- 4. Migrar produtos existentes (15 produtos ativos que não são "sem estoque")
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT id FROM tendenci_ia_produtos 
    WHERE ativo = true 
    AND (permite_venda_sem_estoque = false OR permite_venda_sem_estoque IS NULL)
  LOOP
    PERFORM sync_ia_product_to_inventory(r.id);
  END LOOP;
END $$;