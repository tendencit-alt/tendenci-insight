-- Adicionar coluna whatsapp_connection_id na tabela de campanhas
ALTER TABLE public.tendenci_prospec_arq_campaigns
ADD COLUMN IF NOT EXISTS whatsapp_connection_id UUID NULL
REFERENCES public.tendenci_whatsapp_connections(id);