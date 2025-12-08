
-- Adicionar campo processed_at na tabela de agendamentos de arquitetos
ALTER TABLE tendenci_prospec_arq_agendamentos 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Criar índice para tarefas automatizadas pendentes
CREATE INDEX IF NOT EXISTS idx_architect_tasks_automated_pending 
ON tendenci_prospec_arq_agendamentos(tipo_tarefa, status, data_agendamento) 
WHERE tipo_tarefa = 'automatizada' AND status = 'pendente';

-- Criar/Atualizar RPC para buscar tarefas automatizadas de AMBOS os módulos
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Tarefas do CRM (crm_tasks)
  SELECT 
    t.id as tarefa_id,
    t.deal_id,
    d.lead_id,
    d.architect_id as arquiteto_id,
    COALESCE(c.name, a.name, 'Cliente') as nome,
    COALESCE(t.whatsapp_number, c.phone, a.phone) as telefone,
    'texto'::TEXT as tipo_envio,
    t.note as conteudo_texto,
    wc.id as whatsapp_connection_id,
    wc.instance_name,
    wc.instance_id,
    t.due_at,
    t.created_by,
    'crm'::TEXT as origem_modulo
  FROM crm_tasks t
  LEFT JOIN crm_deals d ON t.deal_id = d.id
  LEFT JOIN leads l ON d.lead_id = l.id
  LEFT JOIN clients c ON l.client_id = c.id
  LEFT JOIN architects a ON d.architect_id = a.id
  LEFT JOIN tendenci_whatsapp_connections wc ON wc.user_id = t.created_by AND wc.status = 'connected'
  WHERE t.tipo_tarefa = 'automatizada'
    AND t.status = 'open'
    AND t.due_at <= NOW()
    AND t.processed_at IS NULL
    AND wc.id IS NOT NULL

  UNION ALL

  -- Tarefas de Arquitetos (tendenci_prospec_arq_agendamentos)
  SELECT 
    ag.id as tarefa_id,
    NULL::UUID as deal_id,
    NULL::UUID as lead_id,
    ag.architect_id as arquiteto_id,
    a.name as nome,
    COALESCE(ag.whatsapp_number, a.phone) as telefone,
    'texto'::TEXT as tipo_envio,
    ag.observacoes as conteudo_texto,
    wc.id as whatsapp_connection_id,
    wc.instance_name,
    wc.instance_id,
    ag.data_agendamento as due_at,
    ag.vendedor_id as created_by,
    'prospeccao'::TEXT as origem_modulo
  FROM tendenci_prospec_arq_agendamentos ag
  LEFT JOIN architects a ON ag.architect_id = a.id
  LEFT JOIN tendenci_whatsapp_connections wc ON wc.user_id = ag.vendedor_id AND wc.status = 'connected'
  WHERE ag.tipo_tarefa = 'automatizada'
    AND ag.status = 'pendente'
    AND ag.data_agendamento <= NOW()
    AND ag.processed_at IS NULL
    AND wc.id IS NOT NULL

  ORDER BY due_at ASC;
END;
$$;
