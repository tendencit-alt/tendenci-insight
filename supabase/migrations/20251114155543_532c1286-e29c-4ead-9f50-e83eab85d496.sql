-- ============================================
-- MÓDULO DE PROSPECÇÃO DE ARQUITETOS
-- Fase 1, 2 e 3: Estrutura Base + Dashboard + CRM
-- ============================================

-- 1. Adicionar novos campos à tabela architects
ALTER TABLE public.architects
ADD COLUMN IF NOT EXISTS status_funil text DEFAULT 'novo_arquiteto',
ADD COLUMN IF NOT EXISTS vendedor_responsavel uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS origem text,
ADD COLUMN IF NOT EXISTS data_primeiro_contato timestamp with time zone,
ADD COLUMN IF NOT EXISTS data_ultimo_contato timestamp with time zone,
ADD COLUMN IF NOT EXISTS tag_prospeccao text;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_architects_status_funil ON public.architects(status_funil);
CREATE INDEX IF NOT EXISTS idx_architects_vendedor ON public.architects(vendedor_responsavel);
CREATE INDEX IF NOT EXISTS idx_architects_data_ultimo_contato ON public.architects(data_ultimo_contato);

-- 2. Criar tabela de logs de interações (histórico)
CREATE TABLE IF NOT EXISTS public.tendenci_prospec_arq_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  architect_id uuid NOT NULL REFERENCES public.architects(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- 'ia', 'vendedor', 'sistema', 'agendamento'
  mensagem text,
  canal text, -- 'whatsapp', 'telefone', 'email', 'presencial', 'sistema'
  enviado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  campanha_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prospec_logs_architect ON public.tendenci_prospec_arq_logs(architect_id);
CREATE INDEX IF NOT EXISTS idx_prospec_logs_created ON public.tendenci_prospec_arq_logs(created_at DESC);

-- 3. Criar tabela de campanhas
CREATE TABLE IF NOT EXISTS public.tendenci_prospec_arq_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  segmento_id uuid,
  sequencia_id uuid,
  vendedor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'rascunho', -- 'rascunho', 'ativa', 'pausada', 'concluida', 'cancelada'
  data_inicio timestamp with time zone,
  data_fim timestamp with time zone,
  dias_semana integer[], -- [0,1,2,3,4,5,6] domingo=0
  horarios jsonb DEFAULT '[]'::jsonb, -- [{"inicio": "09:00", "fim": "18:00"}]
  intervalo_minimo_minutos integer DEFAULT 60,
  criterio_interesse jsonb DEFAULT '{}'::jsonb,
  agendar_automatico boolean DEFAULT false,
  webhook_n8n text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.tendenci_prospec_arq_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_vendedor ON public.tendenci_prospec_arq_campaigns(vendedor_id);

-- 4. Criar tabela de arquitetos em campanhas
CREATE TABLE IF NOT EXISTS public.tendenci_prospec_arq_campaign_architects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id uuid NOT NULL REFERENCES public.tendenci_prospec_arq_campaigns(id) ON DELETE CASCADE,
  architect_id uuid NOT NULL REFERENCES public.architects(id) ON DELETE CASCADE,
  status text DEFAULT 'pendente', -- 'pendente', 'enviado', 'respondeu', 'interessado', 'sem_interesse', 'agendado', 'concluido'
  data_envio timestamp with time zone,
  data_resposta timestamp with time zone,
  data_interesse timestamp with time zone,
  respondeu boolean DEFAULT false,
  interessado boolean DEFAULT false,
  agendamento_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(campanha_id, architect_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_arch_campanha ON public.tendenci_prospec_arq_campaign_architects(campanha_id);
CREATE INDEX IF NOT EXISTS idx_campaign_arch_architect ON public.tendenci_prospec_arq_campaign_architects(architect_id);
CREATE INDEX IF NOT EXISTS idx_campaign_arch_status ON public.tendenci_prospec_arq_campaign_architects(status);

-- 5. Criar tabela de segmentos
CREATE TABLE IF NOT EXISTS public.tendenci_prospec_arq_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 6. Criar tabela de sequências IA
CREATE TABLE IF NOT EXISTS public.tendenci_prospec_arq_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  mensagens jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativa boolean DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 7. Criar tabela de agendamentos
CREATE TABLE IF NOT EXISTS public.tendenci_prospec_arq_agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  architect_id uuid NOT NULL REFERENCES public.architects(id) ON DELETE CASCADE,
  campanha_id uuid REFERENCES public.tendenci_prospec_arq_campaigns(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  vendedor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  data_agendamento timestamp with time zone NOT NULL,
  canal text DEFAULT 'whatsapp', -- 'whatsapp', 'telefone', 'presencial', 'online'
  status text DEFAULT 'agendado', -- 'agendado', 'confirmado', 'realizado', 'cancelado', 'remarcado'
  observacoes text,
  criado_por_ia boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_architect ON public.tendenci_prospec_arq_agendamentos(architect_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_vendedor ON public.tendenci_prospec_arq_agendamentos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON public.tendenci_prospec_arq_agendamentos(data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON public.tendenci_prospec_arq_agendamentos(status);

-- 8. Criar tabela de configurações n8n
CREATE TABLE IF NOT EXISTS public.tendenci_prospec_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_envio text,
  webhook_retorno text,
  token text,
  numero_whatsapp text,
  status_conexao text DEFAULT 'offline', -- 'online', 'offline', 'erro'
  ultima_verificacao timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Inserir configuração padrão se não existir
INSERT INTO public.tendenci_prospec_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.tendenci_prospec_settings);

-- 9. Habilitar RLS em todas as tabelas
ALTER TABLE public.tendenci_prospec_arq_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tendenci_prospec_arq_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tendenci_prospec_arq_campaign_architects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tendenci_prospec_arq_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tendenci_prospec_arq_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tendenci_prospec_arq_agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tendenci_prospec_settings ENABLE ROW LEVEL SECURITY;

-- 10. Criar políticas RLS

-- Logs: autenticados podem ler, admins podem tudo
CREATE POLICY "Autenticados leem logs" ON public.tendenci_prospec_arq_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados criam logs" ON public.tendenci_prospec_arq_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Campanhas: vendedores veem suas campanhas, admins veem tudo
CREATE POLICY "Vendedores veem suas campanhas" ON public.tendenci_prospec_arq_campaigns
  FOR SELECT USING (
    auth.uid() = vendedor_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins gerenciam campanhas" ON public.tendenci_prospec_arq_campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Campaign Architects: segue regra das campanhas
CREATE POLICY "Acesso via campanha" ON public.tendenci_prospec_arq_campaign_architects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tendenci_prospec_arq_campaigns c
      WHERE c.id = campanha_id AND (
        c.vendedor_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "Admins gerenciam campaign architects" ON public.tendenci_prospec_arq_campaign_architects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Segmentos: autenticados leem, admins gerenciam
CREATE POLICY "Autenticados leem segmentos" ON public.tendenci_prospec_arq_segments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins gerenciam segmentos" ON public.tendenci_prospec_arq_segments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Sequências: autenticados leem, admins gerenciam
CREATE POLICY "Autenticados leem sequencias" ON public.tendenci_prospec_arq_sequences
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins gerenciam sequencias" ON public.tendenci_prospec_arq_sequences
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Agendamentos: vendedores veem seus agendamentos, admins veem tudo
CREATE POLICY "Vendedores veem seus agendamentos" ON public.tendenci_prospec_arq_agendamentos
  FOR SELECT USING (
    auth.uid() = vendedor_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Autenticados criam agendamentos" ON public.tendenci_prospec_arq_agendamentos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Responsáveis atualizam agendamentos" ON public.tendenci_prospec_arq_agendamentos
  FOR UPDATE USING (
    auth.uid() = vendedor_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Settings: apenas admins
CREATE POLICY "Apenas admins acessam settings" ON public.tendenci_prospec_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 11. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_prospec_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 12. Criar triggers para updated_at
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.tendenci_prospec_arq_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_prospec_updated_at();

CREATE TRIGGER update_segments_updated_at
  BEFORE UPDATE ON public.tendenci_prospec_arq_segments
  FOR EACH ROW
  EXECUTE FUNCTION update_prospec_updated_at();

CREATE TRIGGER update_sequences_updated_at
  BEFORE UPDATE ON public.tendenci_prospec_arq_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_prospec_updated_at();

CREATE TRIGGER update_agendamentos_updated_at
  BEFORE UPDATE ON public.tendenci_prospec_arq_agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_prospec_updated_at();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.tendenci_prospec_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_prospec_updated_at();

-- 13. Comentários para documentação
COMMENT ON TABLE public.tendenci_prospec_arq_logs IS 'Histórico de todas as interações com arquitetos (IA, vendedor, sistema)';
COMMENT ON TABLE public.tendenci_prospec_arq_campaigns IS 'Campanhas de prospecção automática via IA';
COMMENT ON TABLE public.tendenci_prospec_arq_campaign_architects IS 'Relação entre campanhas e arquitetos';
COMMENT ON TABLE public.tendenci_prospec_arq_segments IS 'Segmentos de arquitetos para targeting';
COMMENT ON TABLE public.tendenci_prospec_arq_sequences IS 'Sequências de mensagens IA';
COMMENT ON TABLE public.tendenci_prospec_arq_agendamentos IS 'Agendamentos de reuniões com arquitetos';
COMMENT ON TABLE public.tendenci_prospec_settings IS 'Configurações de integração n8n/WhatsApp';