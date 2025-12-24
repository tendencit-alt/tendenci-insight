-- Remover a constraint antiga
ALTER TABLE production_logs DROP CONSTRAINT IF EXISTS production_logs_action_type_check;

-- Criar nova constraint com priority_change incluído
ALTER TABLE production_logs 
ADD CONSTRAINT production_logs_action_type_check 
CHECK (action_type = ANY (ARRAY[
  'created'::text, 
  'phase_started'::text, 
  'phase_completed'::text, 
  'phase_change'::text, 
  'status_change'::text, 
  'assigned'::text, 
  'note_added'::text, 
  'attachment_added'::text,
  'priority_change'::text
]));