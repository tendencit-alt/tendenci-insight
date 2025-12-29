-- Tabela de sessões de disparo
CREATE TABLE IF NOT EXISTS dispatch_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('followup', 'group_invite')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  source TEXT NOT NULL DEFAULT 'manual',
  total_leads INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  estimated_duration_seconds INTEGER,
  avg_time_per_lead_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar realtime para sessões
ALTER TABLE dispatch_sessions REPLICA IDENTITY FULL;

-- Tabela de itens do disparo para tracking individual
CREATE TABLE IF NOT EXISTS dispatch_session_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES dispatch_sessions(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  followup_number INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  processing_started_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar realtime para itens
ALTER TABLE dispatch_session_items REPLICA IDENTITY FULL;

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_dispatch_sessions_status ON dispatch_sessions(status);
CREATE INDEX IF NOT EXISTS idx_dispatch_sessions_type ON dispatch_sessions(type);
CREATE INDEX IF NOT EXISTS idx_dispatch_sessions_created ON dispatch_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispatch_session_items_session ON dispatch_session_items(session_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_session_items_status ON dispatch_session_items(status);

-- RLS policies (tabelas públicas para edge functions)
ALTER TABLE dispatch_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_session_items ENABLE ROW LEVEL SECURITY;

-- Política permissiva para leitura (usuários autenticados)
CREATE POLICY "Authenticated users can view dispatch sessions"
ON dispatch_sessions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view dispatch items"
ON dispatch_session_items FOR SELECT
TO authenticated
USING (true);

-- Service role pode fazer tudo
CREATE POLICY "Service role can manage dispatch sessions"
ON dispatch_sessions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can manage dispatch items"
ON dispatch_session_items FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Adicionar tabelas ao realtime
ALTER PUBLICATION supabase_realtime ADD TABLE dispatch_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE dispatch_session_items;