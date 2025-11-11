-- Adicionar campo para identificar leads vindos da automação IA
ALTER TABLE crm_deals ADD COLUMN from_ai BOOLEAN DEFAULT false;

-- Criar índice para melhor performance em queries
CREATE INDEX idx_crm_deals_from_ai ON crm_deals(from_ai);

-- Comentário explicativo
COMMENT ON COLUMN crm_deals.from_ai IS 'Indica se o lead foi criado automaticamente pela integração n8n/IA';