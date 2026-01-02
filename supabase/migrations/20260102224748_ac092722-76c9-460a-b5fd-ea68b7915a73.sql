-- Tabela para histórico de conversas da IA de atendimento
CREATE TABLE ia_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  instance_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  media_type TEXT DEFAULT 'text',
  media_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para busca rápida
CREATE INDEX idx_ia_conversations_phone ON ia_conversations(phone_number, created_at DESC);
CREATE INDEX idx_ia_conversations_instance ON ia_conversations(instance_name, created_at DESC);

-- Enable RLS
ALTER TABLE ia_conversations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Autenticados podem ler conversas IA"
ON ia_conversations FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sistema pode inserir conversas IA"
ON ia_conversations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins podem deletar conversas IA"
ON ia_conversations FOR DELETE
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- Enable realtime for monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE ia_conversations;