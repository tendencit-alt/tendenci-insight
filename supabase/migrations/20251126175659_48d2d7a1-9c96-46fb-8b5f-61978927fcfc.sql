-- Habilitar extensão pg_net para HTTP assíncrono
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar tabela de fila de envios de campanhas
CREATE TABLE IF NOT EXISTS tendenci_campaign_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID REFERENCES tendenci_campaign_dispatches(id) ON DELETE CASCADE,
  arquiteto_id UUID REFERENCES architects(id) ON DELETE CASCADE,
  campanha_id UUID REFERENCES tendenci_prospec_arq_campaigns(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro', 'cancelado')),
  agendado_para TIMESTAMPTZ NOT NULL,
  enviado_em TIMESTAMPTZ,
  erro_mensagem TEXT,
  tentativas INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_campaign_queue_dispatch ON tendenci_campaign_queue(dispatch_id);
CREATE INDEX idx_campaign_queue_status ON tendenci_campaign_queue(status);
CREATE INDEX idx_campaign_queue_agendado ON tendenci_campaign_queue(agendado_para);

-- RLS policies
ALTER TABLE tendenci_campaign_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ler fila de campanhas"
  ON tendenci_campaign_queue FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sistema pode gerenciar fila"
  ON tendenci_campaign_queue FOR ALL
  USING (true)
  WITH CHECK (true);