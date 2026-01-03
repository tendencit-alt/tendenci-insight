-- Adicionar colunas de níveis de autoridade à tabela de conhecimento
ALTER TABLE tendenci_ia_conhecimento 
ADD COLUMN IF NOT EXISTS nivel_autoridade TEXT DEFAULT 'orientacao',
ADD COLUMN IF NOT EXISTS prioridade INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS grau_certeza TEXT DEFAULT 'alto';

-- Comentários para documentação
COMMENT ON COLUMN tendenci_ia_conhecimento.nivel_autoridade IS 'Nível de autoridade: definitivo, orientacao, sugestao';
COMMENT ON COLUMN tendenci_ia_conhecimento.prioridade IS 'Prioridade de uso: 1 (mais alta) a 5 (mais baixa)';
COMMENT ON COLUMN tendenci_ia_conhecimento.grau_certeza IS 'Grau de certeza: absoluto, alto, medio, baixo';