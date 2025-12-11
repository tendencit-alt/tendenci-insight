-- Inserir item de menu para Produção
INSERT INTO menu_items (label, icon, route, module, position, visible)
VALUES ('Produção', 'Factory', '/producao', 'producao', 4, true);

-- Adicionar 'producao' ao enum app_module se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'producao' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_module')) THEN
    ALTER TYPE app_module ADD VALUE 'producao';
  END IF;
END $$;