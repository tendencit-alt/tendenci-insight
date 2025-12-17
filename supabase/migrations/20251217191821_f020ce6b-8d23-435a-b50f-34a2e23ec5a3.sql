
-- Remover constraint antiga
ALTER TABLE architect_history DROP CONSTRAINT IF EXISTS architect_history_event_type_check;

-- Adicionar constraint atualizada com todos os valores usados no sistema
ALTER TABLE architect_history ADD CONSTRAINT architect_history_event_type_check 
CHECK (event_type = ANY (ARRAY[
  'nota', 
  'sistema', 
  'relacionamento', 
  'cliente_cadastrado', 
  'automated_message',
  'status_change',
  'observacao',
  'Comentário Interno'
]));
