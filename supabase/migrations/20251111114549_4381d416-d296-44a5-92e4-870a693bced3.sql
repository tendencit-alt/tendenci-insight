-- Atualizar constraint de temperatura dos leads para incluir "morno"
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_temperature_check;
ALTER TABLE leads ADD CONSTRAINT leads_temperature_check CHECK (temperature IN ('frio', 'morno', 'quente'));

-- Adicionar novos campos em crm_deals
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS product_type TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS conversation_history TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS scheduled_call TIMESTAMP WITH TIME ZONE;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS last_interaction TIMESTAMP WITH TIME ZONE;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS ai_status TEXT;

-- Adicionar comentários para documentação
COMMENT ON COLUMN crm_deals.product_type IS 'Tipo de produto: Planejado ou Móvel';
COMMENT ON COLUMN crm_deals.conversation_history IS 'Histórico automatizado de conversas via IA/WhatsApp';
COMMENT ON COLUMN crm_deals.scheduled_call IS 'Data e hora agendada para follow-up';
COMMENT ON COLUMN crm_deals.last_interaction IS 'Última interação registrada (atualizado automaticamente)';
COMMENT ON COLUMN crm_deals.ai_status IS 'Status gerado pela IA baseado no comportamento do lead';