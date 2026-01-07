-- Atualizar função de sincronização para incluir categoria "Produto"
CREATE OR REPLACE FUNCTION sync_ia_product_to_inventory(p_ia_produto_id UUID)
RETURNS UUID AS $$
DECLARE
  v_ia_produto RECORD;
  v_product_id UUID;
  v_code TEXT;
  v_next_num INT;
  v_category_id UUID := '2ca37a60-74b7-446c-9a67-fa5ff7f67731'; -- Categoria "Produto"
BEGIN
  SELECT * INTO v_ia_produto 
  FROM tendenci_ia_produtos 
  WHERE id = p_ia_produto_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  IF v_ia_produto.permite_venda_sem_estoque = true THEN
    RETURN NULL;
  END IF;
  
  SELECT id INTO v_product_id 
  FROM products 
  WHERE ia_produto_id = p_ia_produto_id;
  
  IF FOUND THEN
    UPDATE products SET
      name = v_ia_produto.nome,
      description = v_ia_produto.descricao,
      sale_price = v_ia_produto.preco_base,
      image_url = v_ia_produto.imagem_url,
      active = v_ia_produto.ativo,
      category_id = v_category_id,
      updated_at = now()
    WHERE id = v_product_id;
  ELSE
    SELECT COALESCE(MAX(
      CASE 
        WHEN code ~ '^IA-[0-9]+$' THEN SUBSTRING(code FROM 4)::INT 
        ELSE 0 
      END
    ), 0) + 1 INTO v_next_num
    FROM products
    WHERE code LIKE 'IA-%';
    
    v_code := 'IA-' || LPAD(v_next_num::TEXT, 3, '0');
    
    INSERT INTO products (
      code, name, description, sale_price, image_url, 
      ia_produto_id, unit, current_stock, active, category_id
    ) VALUES (
      v_code,
      v_ia_produto.nome,
      v_ia_produto.descricao,
      v_ia_produto.preco_base,
      v_ia_produto.imagem_url,
      p_ia_produto_id,
      'UN',
      COALESCE(v_ia_produto.estoque, 0),
      v_ia_produto.ativo,
      v_category_id
    )
    RETURNING id INTO v_product_id;
    
    UPDATE tendenci_ia_produtos 
    SET inventory_product_id = v_product_id 
    WHERE id = p_ia_produto_id;
  END IF;
  
  RETURN v_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;