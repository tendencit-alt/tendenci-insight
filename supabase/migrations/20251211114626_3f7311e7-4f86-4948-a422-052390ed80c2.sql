-- Criar tabela leads_whatsapp para armazenar leads da IA de atendimento
CREATE TABLE public.leads_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE,
  nome TEXT,
  telefone TEXT NOT NULL,
  conversa_whatsapp TEXT,
  status TEXT DEFAULT 'novo',
  origem TEXT DEFAULT 'ia_atendimento',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.leads_whatsapp ENABLE ROW LEVEL SECURITY;

-- Permitir INSERT público (para webhook/edge function/n8n)
CREATE POLICY "Sistema pode criar leads whatsapp"
  ON public.leads_whatsapp FOR INSERT
  WITH CHECK (true);

-- Permitir SELECT para autenticados
CREATE POLICY "Autenticados leem leads whatsapp"
  ON public.leads_whatsapp FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Permitir UPDATE para autenticados
CREATE POLICY "Autenticados atualizam leads whatsapp"
  ON public.leads_whatsapp FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Permitir DELETE para admins
CREATE POLICY "Admins deletam leads whatsapp"
  ON public.leads_whatsapp FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Índices para performance
CREATE INDEX idx_leads_whatsapp_telefone ON public.leads_whatsapp(telefone);
CREATE INDEX idx_leads_whatsapp_session ON public.leads_whatsapp(session_id);
CREATE INDEX idx_leads_whatsapp_status ON public.leads_whatsapp(status);

-- Trigger para updated_at
CREATE TRIGGER update_leads_whatsapp_updated_at
  BEFORE UPDATE ON public.leads_whatsapp
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();