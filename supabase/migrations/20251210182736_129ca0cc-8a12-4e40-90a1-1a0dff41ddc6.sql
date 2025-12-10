-- Criar tabela de logs de webhook para diagnóstico
CREATE TABLE public.tendenci_webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT,
  instance_name TEXT,
  phone_from TEXT,
  phone_to TEXT,
  message_content TEXT,
  raw_payload JSONB,
  processing_status TEXT DEFAULT 'received',
  error_message TEXT,
  processed_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX idx_webhook_logs_created_at ON tendenci_webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_instance ON tendenci_webhook_logs(instance_name);
CREATE INDEX idx_webhook_logs_status ON tendenci_webhook_logs(processing_status);

-- RLS
ALTER TABLE tendenci_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os logs
CREATE POLICY "Admins can view webhook logs"
ON tendenci_webhook_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permitir inserção pelo sistema (service role)
CREATE POLICY "System can insert webhook logs"
ON tendenci_webhook_logs FOR INSERT
WITH CHECK (true);