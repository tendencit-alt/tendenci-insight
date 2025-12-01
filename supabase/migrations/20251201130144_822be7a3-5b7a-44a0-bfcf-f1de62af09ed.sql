-- Criar tabela followup_logs para rastreamento completo
CREATE TABLE IF NOT EXISTS public.followup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES crm_deals(id) ON DELETE CASCADE,
  followup_number INTEGER NOT NULL,
  message_sent TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela followup_templates para mensagens variáveis
CREATE TABLE IF NOT EXISTS public.followup_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  followup_number INTEGER UNIQUE NOT NULL,
  system_prompt TEXT NOT NULL,
  tone TEXT NOT NULL CHECK (tone IN ('friendly', 'consultive', 'urgency', 'farewell')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar campos na tabela tendenci_whatsapp_connections
ALTER TABLE public.tendenci_whatsapp_connections 
ADD COLUMN IF NOT EXISTS evolution_url TEXT,
ADD COLUMN IF NOT EXISTS evolution_apikey TEXT;

-- RLS policies para followup_logs
ALTER TABLE public.followup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem followup_logs"
ON public.followup_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Sistema cria followup_logs"
ON public.followup_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS policies para followup_templates
ALTER TABLE public.followup_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem templates"
ON public.followup_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins gerenciam templates"
ON public.followup_templates FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

-- Inserir templates padrão
INSERT INTO public.followup_templates (followup_number, system_prompt, tone) VALUES
(1, 'Você é um assistente de vendas amigável. O cliente demonstrou interesse mas não retornou. Envie uma mensagem lembrando gentilmente sobre o orçamento e se oferecendo para ajudar com dúvidas.', 'friendly'),
(2, 'Você é um consultor experiente. O cliente ainda não respondeu após o primeiro follow-up. Envie uma mensagem mais consultiva, destacando benefícios e oferecendo uma call rápida para esclarecer dúvidas.', 'consultive'),
(3, 'Você é um vendedor estratégico. Este é o terceiro contato. Use tom de leve urgência mencionando condições especiais ou disponibilidade limitada, mas mantendo profissionalismo.', 'urgency'),
(4, 'Você é um vendedor respeitoso. Este é o quarto follow-up. Mensagem de despedida gentil: entende que talvez não seja o momento, deixa porta aberta para futuro contato.', 'farewell'),
(5, 'Você é um vendedor cortês. Follow-up final. Mensagem curta de encerramento agradecendo o tempo, reforçando disponibilidade futura sem insistência.', 'farewell')
ON CONFLICT (followup_number) DO NOTHING;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_followup_logs_deal_id ON public.followup_logs(deal_id);
CREATE INDEX IF NOT EXISTS idx_followup_logs_status ON public.followup_logs(status);
CREATE INDEX IF NOT EXISTS idx_followup_logs_sent_at ON public.followup_logs(sent_at);