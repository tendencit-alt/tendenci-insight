-- Create RPC function to get pending automated tasks for n8n
CREATE OR REPLACE FUNCTION get_pending_automated_tasks()
RETURNS TABLE (
  tarefa_id UUID,
  deal_id UUID,
  lead_id UUID,
  arquiteto_id UUID,
  nome TEXT,
  telefone TEXT,
  tipo_envio TEXT,
  conteudo_texto TEXT,
  whatsapp_connection_id UUID,
  instance_name TEXT,
  instance_id TEXT,
  due_at TIMESTAMPTZ,
  created_by UUID,
  origem_modulo TEXT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as tarefa_id,
    t.deal_id,
    d.lead_id,
    d.architect_id as arquiteto_id,
    COALESCE(c.name, a.name) as nome,
    COALESCE(t.whatsapp_number, c.phone, a.phone) as telefone,
    'texto' as tipo_envio,
    t.note as conteudo_texto,
    wc.id as whatsapp_connection_id,
    wc.instance_name,
    wc.instance_id,
    t.due_at,
    t.created_by,
    t.origem_modulo
  FROM crm_tasks t
  LEFT JOIN crm_deals d ON t.deal_id = d.id
  LEFT JOIN leads l ON d.lead_id = l.id
  LEFT JOIN clients c ON l.client_id = c.id
  LEFT JOIN architects a ON d.architect_id = a.id
  LEFT JOIN tendenci_whatsapp_connections wc ON wc.user_id = t.created_by
  WHERE t.tipo_tarefa = 'automatizada'
    AND t.status = 'open'
    AND t.due_at <= NOW()
    AND wc.status = 'connected'
  ORDER BY t.due_at ASC;
END;
$$;