-- Adicionar coluna categoria na tabela architects
ALTER TABLE architects 
ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'metropolitano' 
CHECK (categoria IN ('metropolitano', 'captado'));

-- Atualizar registros existentes para ter uma categoria padrão
UPDATE architects 
SET categoria = 'metropolitano' 
WHERE categoria IS NULL;