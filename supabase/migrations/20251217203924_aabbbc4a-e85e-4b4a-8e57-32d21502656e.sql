-- Criar tabela de erros do sistema
CREATE TABLE public.system_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'ignored')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'edge_function', 'frontend', 'webhook')),
  error_code TEXT,
  stack_trace TEXT,
  metadata JSONB,
  reported_by UUID REFERENCES public.profiles(id),
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver e gerenciar erros
CREATE POLICY "Admins can view all system errors"
  ON public.system_errors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert system errors"
  ON public.system_errors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update system errors"
  ON public.system_errors
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete system errors"
  ON public.system_errors
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy para edge functions inserirem erros automaticamente (sem autenticação de usuário)
CREATE POLICY "Service role can insert errors"
  ON public.system_errors
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_system_errors_updated_at
  BEFORE UPDATE ON public.system_errors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_system_errors_status ON public.system_errors(status);
CREATE INDEX idx_system_errors_severity ON public.system_errors(severity);
CREATE INDEX idx_system_errors_module ON public.system_errors(module);
CREATE INDEX idx_system_errors_created_at ON public.system_errors(created_at DESC);

-- Adicionar item no menu para MASTER
INSERT INTO public.menu_items (label, icon, route, module, position, visible)
VALUES ('Erros do Sistema', 'AlertTriangle', '/system-errors', 'system_errors', 20, true);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_errors;