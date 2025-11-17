
-- Remover constraint antiga
ALTER TABLE crm_timeline DROP CONSTRAINT IF EXISTS valid_update_type;

-- Adicionar constraint atualizada incluindo 'Observação'
ALTER TABLE crm_timeline ADD CONSTRAINT valid_update_type 
CHECK (update_type = ANY (ARRAY[
  'Comentário Interno'::text,
  'Conversa WhatsApp'::text,
  'Reunião / Ligação'::text,
  'Visita / Projeto'::text,
  'Observação IA'::text,
  'Observação'::text
]));
