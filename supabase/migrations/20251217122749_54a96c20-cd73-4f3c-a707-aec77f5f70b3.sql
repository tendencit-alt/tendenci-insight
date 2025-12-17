-- Migração: Corrigir dados históricos - inserir entries na timeline para tarefas automatizadas concluídas

INSERT INTO architect_timeline (architect_id, author_id, message, update_type, created_at)
SELECT 
  a.architect_id,
  a.vendedor_id,
  '📤 Mensagem automatizada enviada (registro retroativo)',
  'Comentário Interno',
  a.updated_at
FROM tendenci_prospec_arq_agendamentos a
WHERE a.status = 'concluida' 
  AND a.tipo_tarefa = 'automatizada'
  AND a.updated_at >= NOW() - INTERVAL '7 days'
  AND NOT EXISTS (
    SELECT 1 FROM architect_timeline t
    WHERE t.architect_id = a.architect_id
      AND t.created_at >= a.updated_at - INTERVAL '5 minutes'
      AND t.created_at <= a.updated_at + INTERVAL '5 minutes'
  );