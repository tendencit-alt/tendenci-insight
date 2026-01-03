-- Tabela para debounce de mensagens múltiplas
CREATE TABLE public.ia_pending_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  instance_name TEXT NOT NULL,
  content TEXT NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para busca rápida de mensagens pendentes
CREATE INDEX idx_ia_pending_messages_lookup 
ON public.ia_pending_messages (phone_number, instance_name, processed, created_at DESC);

-- Tabela para memória de longo prazo do cliente
CREATE TABLE public.ia_client_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  instance_name TEXT NOT NULL,
  client_name TEXT,
  preferences JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  interaction_count INTEGER DEFAULT 0,
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(phone_number, instance_name)
);

-- Índice para busca rápida de memória do cliente
CREATE INDEX idx_ia_client_memory_lookup 
ON public.ia_client_memory (phone_number, instance_name);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ia_client_memory_updated_at
BEFORE UPDATE ON public.ia_client_memory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS básico (desabilitado para edge functions)
ALTER TABLE public.ia_pending_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_client_memory ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir acesso via service role (edge functions)
CREATE POLICY "Service role full access pending messages" 
ON public.ia_pending_messages FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access client memory" 
ON public.ia_client_memory FOR ALL 
USING (true) WITH CHECK (true);

-- Função para limpar mensagens pendentes antigas (mais de 1 hora)
CREATE OR REPLACE FUNCTION public.cleanup_old_pending_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM public.ia_pending_messages 
  WHERE created_at < now() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;