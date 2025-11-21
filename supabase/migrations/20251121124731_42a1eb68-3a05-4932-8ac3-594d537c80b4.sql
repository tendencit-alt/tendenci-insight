-- Adicionar campos para suporte a tarefas automatizadas
ALTER TABLE crm_tasks 
ADD COLUMN IF NOT EXISTS tipo_tarefa TEXT NOT NULL DEFAULT 'interna' CHECK (tipo_tarefa IN ('interna', 'automatizada')),
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Adicionar comentário explicativo
COMMENT ON COLUMN crm_tasks.tipo_tarefa IS 'Tipo de tarefa: interna (manual) ou automatizada (disparo via n8n)';
COMMENT ON COLUMN crm_tasks.whatsapp_number IS 'Número WhatsApp para tarefas automatizadas (obrigatório quando tipo_tarefa = automatizada)';