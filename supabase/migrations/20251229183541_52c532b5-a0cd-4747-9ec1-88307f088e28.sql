-- Adicionar colunas para rastrear convite do grupo de ofertas
ALTER TABLE crm_deals 
ADD COLUMN IF NOT EXISTS group_invite_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS group_invite_sent_at timestamp with time zone;