-- Esquema completo do Tendenci System

-- 1. Roles e Usuários
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE,
  role_id INTEGER REFERENCES roles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Arquitetos
CREATE TABLE architects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  instagram TEXT,
  birthday DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Clientes
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  city TEXT,
  state TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Origens de Lead
CREATE TABLE lead_sources (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

-- 5. Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  architect_id UUID REFERENCES architects(id),
  source_id INTEGER REFERENCES lead_sources(id),
  utm_source TEXT,
  utm_campaign TEXT,
  ad_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'novo' CHECK (status IN ('novo', 'qualificando', 'ganho', 'perdido'))
);

-- 6. Pipelines e Estágios
CREATE TABLE pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL
);

CREATE TABLE pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pos INTEGER NOT NULL
);

-- 7. Negócios (Deals)
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  pipeline_id UUID REFERENCES pipelines(id),
  stage_id UUID REFERENCES pipeline_stages(id),
  title TEXT,
  amount NUMERIC(12,2) DEFAULT 0,
  budget_value NUMERIC(12,2),
  status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado_ganho', 'fechado_perdido')),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Projetos
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  architect_id UUID REFERENCES architects(id),
  client_id UUID REFERENCES clients(id),
  deal_id UUID REFERENCES deals(id),
  name TEXT,
  stage TEXT DEFAULT 'captado' CHECK (stage IN ('captado', 'orçado', 'apresentado', 'aprovado', 'perdido')),
  value NUMERIC(12,2) DEFAULT 0,
  sent_at TIMESTAMPTZ,
  presented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Gastos com Anúncios
CREATE TABLE ad_spend (
  id BIGSERIAL PRIMARY KEY,
  day DATE NOT NULL,
  account_id TEXT,
  campaign_id TEXT,
  adset_id TEXT,
  ad_id TEXT,
  spend NUMERIC(12,2) DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  leads INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Custo de Mensagens
CREATE TABLE msg_costs (
  id BIGSERIAL PRIMARY KEY,
  day DATE NOT NULL,
  phone_number TEXT,
  conversation_id TEXT,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  cost NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  meta_category TEXT,
  lead_id UUID REFERENCES leads(id),
  deal_id UUID REFERENCES deals(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Cadências
CREATE TABLE cadences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL
);

CREATE TABLE cadence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cadence_id UUID REFERENCES cadences(id) ON DELETE CASCADE,
  pos INTEGER NOT NULL,
  channel TEXT CHECK (channel IN ('whatsapp', 'email', 'ligação')),
  template TEXT,
  wait_hours INTEGER DEFAULT 0
);

-- 12. Atividades
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  type TEXT CHECK (type IN ('msg', 'call', 'email', 'visita')),
  when_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  user_id UUID REFERENCES users(id)
);

-- 13. Lembretes
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  done BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed inicial
INSERT INTO roles(name) VALUES ('admin'), ('vendas'), ('parceiro_arquiteto'), ('financeiro');

INSERT INTO pipelines(name) VALUES ('Mesas Maciças');

INSERT INTO pipeline_stages(pipeline_id, name, pos)
SELECT id, 'Contato', 1 FROM pipelines WHERE name = 'Mesas Maciças'
UNION ALL SELECT id, 'Qualificação', 2 FROM pipelines WHERE name = 'Mesas Maciças'
UNION ALL SELECT id, 'Orçado', 3 FROM pipelines WHERE name = 'Mesas Maciças'
UNION ALL SELECT id, 'Apresentado', 4 FROM pipelines WHERE name = 'Mesas Maciças'
UNION ALL SELECT id, 'Negociação', 5 FROM pipelines WHERE name = 'Mesas Maciças'
UNION ALL SELECT id, 'Fechado', 6 FROM pipelines WHERE name = 'Mesas Maciças'
UNION ALL SELECT id, 'Perdido', 7 FROM pipelines WHERE name = 'Mesas Maciças';

INSERT INTO lead_sources(code, name) VALUES 
  ('meta', 'Meta Ads'),
  ('organico', 'Orgânico'),
  ('indicacao', 'Indicação'),
  ('instagram', 'Instagram'),
  ('whatsapp', 'WhatsApp');

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE architects ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_spend ENABLE ROW LEVEL SECURITY;
ALTER TABLE msg_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadences ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de leitura (permitir leitura para usuários autenticados)
CREATE POLICY "Permitir leitura para autenticados" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir leitura para autenticados" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir leitura para autenticados" ON architects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir leitura para autenticados" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir leitura para autenticados" ON lead_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir leitura para autenticados" ON leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir leitura para autenticados" ON pipelines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir leitura para autenticados" ON pipeline_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir leitura para autenticados" ON deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir leitura para autenticados" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir leitura para autenticados" ON ad_spend FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir leitura para autenticados" ON msg_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir leitura para autenticados" ON cadences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir leitura para autenticados" ON cadence_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir leitura para autenticados" ON activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir leitura para autenticados" ON reminders FOR SELECT TO authenticated USING (true);

-- Políticas de escrita (permitir para autenticados por enquanto)
CREATE POLICY "Permitir inserção para autenticados" ON architects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir atualização para autenticados" ON architects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Permitir inserção para autenticados" ON clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir atualização para autenticados" ON clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Permitir inserção para autenticados" ON leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir atualização para autenticados" ON leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Permitir inserção para autenticados" ON deals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir atualização para autenticados" ON deals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Permitir inserção para autenticados" ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir atualização para autenticados" ON projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Permitir inserção para autenticados" ON activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir inserção para autenticados" ON reminders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir atualização para autenticados" ON reminders FOR UPDATE TO authenticated USING (true);