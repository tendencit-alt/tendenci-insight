-- Dropar função existente e recriar com novos campos
DROP FUNCTION IF EXISTS get_pending_followups();

-- Criar RPC melhorado para buscar follow-ups pendentes
CREATE OR REPLACE FUNCTION get_pending_followups()
RETURNS TABLE (
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
  whatsapp_connection_id UUID,
  evolution_url TEXT,
  evolution_apikey TEXT,
  product_type TEXT,
  categoria TEXT,
  system_prompt TEXT,
  tone TEXT
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
    COALESCE(d.followup_count, 0) as followup_count,
    d.owner_id,
    p.full_name as owner_name,
    wc.instance_name,
    wc.instance_id,
    wc.id as whatsapp_connection_id,
    wc.evolution_url,
    wc.evolution_apikey,
    d.product_type,
    d.categoria,
    ft.system_prompt,
    ft.tone
  FROM crm_deals d
  INNER JOIN leads l ON l.id = d.lead_id
  INNER JOIN clients c ON c.id = l.client_id
  INNER JOIN profiles p ON p.id = d.owner_id
  LEFT JOIN tendenci_whatsapp_connections wc ON wc.user_id = d.owner_id
  LEFT JOIN followup_templates ft ON ft.followup_number = COALESCE(d.followup_count, 0) + 1
  WHERE 
    d.followup_enabled = true
    AND d.status = 'aberto'
    AND c.phone IS NOT NULL
    AND c.phone != ''
    AND wc.connected = true
    AND wc.evolution_url IS NOT NULL
    AND wc.evolution_apikey IS NOT NULL
    AND COALESCE(d.followup_count, 0) < COALESCE(d.max_followups, 5)
    AND (
      d.last_followup_at IS NULL 
      OR d.last_followup_at < NOW() - INTERVAL '24 hours'
    )
    AND (
      d.last_interaction IS NULL 
      OR d.last_interaction < NOW() - INTERVAL '48 hours'
    )
    -- Filtro de horário comercial (9h-18h)
    AND EXTRACT(HOUR FROM NOW()) BETWEEN 9 AND 18
    -- Filtro de dias úteis (seg-sex)
    AND EXTRACT(DOW FROM NOW()) BETWEEN 1 AND 5
  ORDER BY d.last_followup_at ASC NULLS FIRST
  LIMIT 50;
END;
$$;