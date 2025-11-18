-- Adicionar novos campos à tabela de campanhas
ALTER TABLE tendenci_prospec_arq_campaigns
ADD COLUMN IF NOT EXISTS tipo_envio TEXT CHECK (tipo_envio IN ('texto', 'imagem', 'audio')),
ADD COLUMN IF NOT EXISTS conteudo_texto TEXT,
ADD COLUMN IF NOT EXISTS conteudo_imagem_url TEXT,
ADD COLUMN IF NOT EXISTS conteudo_audio_url TEXT,
ADD COLUMN IF NOT EXISTS arquitetos_selecionados UUID[];

-- Atualizar status para aceitar novos valores
ALTER TABLE tendenci_prospec_arq_campaigns
DROP CONSTRAINT IF EXISTS tendenci_prospec_arq_campaigns_status_check;

ALTER TABLE tendenci_prospec_arq_campaigns
ADD CONSTRAINT tendenci_prospec_arq_campaigns_status_check 
CHECK (status IN ('rascunho', 'agendado', 'enviando', 'enviado', 'erro', 'pausada', 'ativa', 'inativa'));

-- Criar tabela de log de disparos da campanha
CREATE TABLE IF NOT EXISTS tendenci_prospec_arq_campaign_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID NOT NULL REFERENCES tendenci_prospec_arq_campaigns(id) ON DELETE CASCADE,
  architect_id UUID NOT NULL REFERENCES architects(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pendente', 'enviando', 'sucesso', 'erro')),
  mensagem_erro TEXT,
  tentativas INTEGER DEFAULT 0,
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE tendenci_prospec_arq_campaign_dispatches ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para campaign_dispatches
CREATE POLICY "Autenticados podem ler dispatches"
ON tendenci_prospec_arq_campaign_dispatches FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar dispatches"
ON tendenci_prospec_arq_campaign_dispatches FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar dispatches"
ON tendenci_prospec_arq_campaign_dispatches FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_campaign_dispatches_campanha 
ON tendenci_prospec_arq_campaign_dispatches(campanha_id);

CREATE INDEX IF NOT EXISTS idx_campaign_dispatches_architect 
ON tendenci_prospec_arq_campaign_dispatches(architect_id);

CREATE INDEX IF NOT EXISTS idx_campaign_dispatches_status 
ON tendenci_prospec_arq_campaign_dispatches(status);