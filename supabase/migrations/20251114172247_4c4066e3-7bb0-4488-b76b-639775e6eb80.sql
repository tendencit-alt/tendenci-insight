-- Criar função para atualizar updated_at (caso não exista)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabela para armazenar conexões WhatsApp via Evolution API
CREATE TABLE IF NOT EXISTS public.tendenci_whatsapp_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_name TEXT NOT NULL UNIQUE,
  instance_id TEXT NULL,
  phone_number TEXT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  qr_code TEXT NULL,
  qr_code_base64 TEXT NULL,
  created_by UUID NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  connected_at TIMESTAMP WITH TIME ZONE NULL,
  last_sync TIMESTAMP WITH TIME ZONE NULL,
  metadata JSONB NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_status ON public.tendenci_whatsapp_connections(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_instance_name ON public.tendenci_whatsapp_connections(instance_name);

-- RLS Policies
ALTER TABLE public.tendenci_whatsapp_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins podem ver todas as conexões" ON public.tendenci_whatsapp_connections;
CREATE POLICY "Admins podem ver todas as conexões"
  ON public.tendenci_whatsapp_connections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins podem criar conexões" ON public.tendenci_whatsapp_connections;
CREATE POLICY "Admins podem criar conexões"
  ON public.tendenci_whatsapp_connections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins podem atualizar conexões" ON public.tendenci_whatsapp_connections;
CREATE POLICY "Admins podem atualizar conexões"
  ON public.tendenci_whatsapp_connections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins podem deletar conexões" ON public.tendenci_whatsapp_connections;
CREATE POLICY "Admins podem deletar conexões"
  ON public.tendenci_whatsapp_connections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_whatsapp_connections_updated_at ON public.tendenci_whatsapp_connections;
CREATE TRIGGER update_whatsapp_connections_updated_at
  BEFORE UPDATE ON public.tendenci_whatsapp_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();