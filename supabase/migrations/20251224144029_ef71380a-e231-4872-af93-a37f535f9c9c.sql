-- Adicionar colunas de agendamento na tabela de campanhas
ALTER TABLE public.tendenci_prospec_arq_campaigns 
ADD COLUMN IF NOT EXISTS tipo_agendamento text DEFAULT 'unico',
ADD COLUMN IF NOT EXISTS data_hora_unica timestamp with time zone,
ADD COLUMN IF NOT EXISTS horario_inicio text DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS horario_fim text DEFAULT '18:00';

-- Criar índice para buscar campanhas agendadas
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled 
ON public.tendenci_prospec_arq_campaigns(status, agendar_automatico) 
WHERE status = 'agendado' AND agendar_automatico = true;