-- Adicionar coluna para controle de disparos diários de campanhas recorrentes
ALTER TABLE public.tendenci_prospec_arq_campaigns 
ADD COLUMN IF NOT EXISTS ultimo_disparo_em TIMESTAMP WITH TIME ZONE;

-- Adicionar coluna para identificar campanhas recorrentes no dispatch
ALTER TABLE public.tendenci_campaign_dispatches
ADD COLUMN IF NOT EXISTS is_recurrent BOOLEAN DEFAULT false;

-- Índice para performance na busca de campanhas agendadas
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled 
ON public.tendenci_prospec_arq_campaigns(status, agendar_automatico) 
WHERE status = 'agendado' AND agendar_automatico = true;

-- Comentários para documentação
COMMENT ON COLUMN public.tendenci_prospec_arq_campaigns.ultimo_disparo_em IS 'Timestamp do último disparo para controle de campanhas recorrentes';
COMMENT ON COLUMN public.tendenci_campaign_dispatches.is_recurrent IS 'Indica se o dispatch faz parte de uma campanha recorrente';