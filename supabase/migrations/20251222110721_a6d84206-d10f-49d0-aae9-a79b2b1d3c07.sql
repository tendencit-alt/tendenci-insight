-- CORREÇÃO 1: Atualizar constraint valid_update_type para incluir 'Reativação Automática'
-- O cron job reactivate_lost_deals_to_followup estava falhando por causa disso
ALTER TABLE crm_timeline DROP CONSTRAINT IF EXISTS valid_update_type;
ALTER TABLE crm_timeline ADD CONSTRAINT valid_update_type CHECK (
  update_type = ANY (ARRAY[
    'Comentário Interno',
    'Conversa WhatsApp', 
    'Reunião / Ligação',
    'Visita / Projeto',
    'Observação IA',
    'Observação',
    'Reativação Automática'
  ])
);