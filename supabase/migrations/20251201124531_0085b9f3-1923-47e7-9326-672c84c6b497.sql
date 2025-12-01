-- Adicionar campos para sistema de follow-up automático na tabela crm_deals
ALTER TABLE crm_deals
ADD COLUMN IF NOT EXISTS followup_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS followup_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS max_followups INTEGER DEFAULT 5;

-- Criar índice para otimizar busca de deals pendentes de follow-up
CREATE INDEX IF NOT EXISTS idx_crm_deals_followup_pending 
ON crm_deals(stage_id, status, followup_enabled, last_followup_at) 
WHERE status = 'aberto' AND followup_enabled = true;

-- Criar RPC para buscar deals elegíveis para follow-up
CREATE OR REPLACE FUNCTION get_pending_followups()
RETURNS TABLE(
  deal_id UUID,
  lead_id UUID,
  client_name TEXT,
  client_phone TEXT,
  conversation_history TEXT,
  followup_count INTEGER,
  owner_id UUID,
  owner_name TEXT,
  instance_name TEXT,
  instance_id TEXT,
  whatsapp_connection_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as deal_id,
    d.lead_id,
    c.name as client_name,
    c.phone as client_phone,
    d.conversation_history,
    d.followup_count,
    d.owner_id,
    p.full_name as owner_name,
    wc.instance_name,
    wc.instance_id,
    wc.id as whatsapp_connection_id
  FROM crm_deals d
  INNER JOIN crm_stages s ON d.stage_id = s.id
  LEFT JOIN leads l ON d.lead_id = l.id
  LEFT JOIN clients c ON l.client_id = c.id
  LEFT JOIN profiles p ON d.owner_id = p.id
  LEFT JOIN tendenci_whatsapp_connections wc ON wc.user_id = d.owner_id AND wc.status = 'connected'
  WHERE s.name = 'Follow Up (I.A)'
    AND d.status = 'aberto'
    AND d.followup_enabled = true
    AND d.followup_count < d.max_followups
    AND (
      (d.last_followup_at IS NULL AND d.last_interaction < NOW() - INTERVAL '2 days')
      OR 
      (d.last_followup_at < NOW() - INTERVAL '2 days')
    )
    AND c.phone IS NOT NULL
    AND wc.id IS NOT NULL
  ORDER BY d.last_interaction ASC
  LIMIT 50;
END;
$$;