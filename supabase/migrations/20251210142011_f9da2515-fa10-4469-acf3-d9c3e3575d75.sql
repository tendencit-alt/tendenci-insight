-- Adicionar coluna is_ia_instance para identificar instâncias da IA
ALTER TABLE tendenci_whatsapp_connections 
ADD COLUMN IF NOT EXISTS is_ia_instance BOOLEAN DEFAULT false;

-- Índice para busca rápida de instâncias da IA
CREATE INDEX IF NOT EXISTS idx_whatsapp_ia_instance ON tendenci_whatsapp_connections(is_ia_instance) WHERE is_ia_instance = true;