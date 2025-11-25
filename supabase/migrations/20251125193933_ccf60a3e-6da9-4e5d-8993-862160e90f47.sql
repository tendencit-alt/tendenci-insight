-- Fase 1: Criar tabela de controle de dispatches em background
CREATE TABLE IF NOT EXISTS public.tendenci_campaign_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID NOT NULL REFERENCES public.tendenci_prospec_arq_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'cancelado', 'erro')),
  total_arquitetos INT NOT NULL DEFAULT 0,
  enviados_sucesso INT NOT NULL DEFAULT 0,
  enviados_erro INT NOT NULL DEFAULT 0,
  arquiteto_atual TEXT,
  progresso_percentual INT NOT NULL DEFAULT 0,
  iniciado_em TIMESTAMPTZ DEFAULT now(),
  concluido_em TIMESTAMPTZ,
  erro_mensagem TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_campaign_dispatches_campanha ON public.tendenci_campaign_dispatches(campanha_id);
CREATE INDEX IF NOT EXISTS idx_campaign_dispatches_user ON public.tendenci_campaign_dispatches(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_dispatches_status ON public.tendenci_campaign_dispatches(status);

-- RLS Policies
ALTER TABLE public.tendenci_campaign_dispatches ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ver seus próprios dispatches
CREATE POLICY "Usuários veem próprios dispatches"
  ON public.tendenci_campaign_dispatches
  FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Sistema pode criar dispatches
CREATE POLICY "Sistema cria dispatches"
  ON public.tendenci_campaign_dispatches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Sistema pode atualizar dispatches
CREATE POLICY "Sistema atualiza dispatches"
  ON public.tendenci_campaign_dispatches
  FOR UPDATE
  USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_campaign_dispatch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_campaign_dispatch_timestamp
  BEFORE UPDATE ON public.tendenci_campaign_dispatches
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_dispatch_updated_at();

-- Comentários
COMMENT ON TABLE public.tendenci_campaign_dispatches IS 'Rastreamento de dispatches de campanhas executadas em background';
COMMENT ON COLUMN public.tendenci_campaign_dispatches.status IS 'Status: pendente, em_andamento, concluido, cancelado, erro';
COMMENT ON COLUMN public.tendenci_campaign_dispatches.progresso_percentual IS 'Progresso de 0 a 100';