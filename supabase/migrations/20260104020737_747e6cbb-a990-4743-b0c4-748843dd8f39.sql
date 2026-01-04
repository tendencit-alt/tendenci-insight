-- Inserir os locais de estoque predefinidos
INSERT INTO stock_locations (name, active, is_default) VALUES
  ('Loja', true, true),
  ('Rústico', true, false),
  ('Escritório', true, false),
  ('Mezanino', true, false),
  ('Quarto 1', true, false),
  ('Quarto 2', true, false),
  ('Quarto 3', true, false),
  ('HDL (Limpeza)', true, false),
  ('Cozinha', true, false)
ON CONFLICT DO NOTHING;

-- Remover is_default do antigo "Depósito Principal" se existir
UPDATE stock_locations SET is_default = false WHERE name = 'Depósito Principal';

-- Criar tabela de estoque por local para produtos IA
CREATE TABLE IF NOT EXISTS tendenci_ia_produtos_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES tendenci_ia_produtos(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES stock_locations(id) ON DELETE CASCADE,
  quantidade integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(produto_id, location_id)
);

-- Habilitar RLS
ALTER TABLE tendenci_ia_produtos_estoque ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view product stock"
ON tendenci_ia_produtos_estoque FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert product stock"
ON tendenci_ia_produtos_estoque FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update product stock"
ON tendenci_ia_produtos_estoque FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete product stock"
ON tendenci_ia_produtos_estoque FOR DELETE
TO authenticated
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_ia_produtos_estoque_updated_at
BEFORE UPDATE ON tendenci_ia_produtos_estoque
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();