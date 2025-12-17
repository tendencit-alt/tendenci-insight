
-- Tabela para bloco de notas de ideias (somente MASTER)
CREATE TABLE public.master_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.master_ideas ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver, criar, editar e deletar
CREATE POLICY "Admins can manage ideas"
ON public.master_ideas
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_master_ideas_updated_at
BEFORE UPDATE ON public.master_ideas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
