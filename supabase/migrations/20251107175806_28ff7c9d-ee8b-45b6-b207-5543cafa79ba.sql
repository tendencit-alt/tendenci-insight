-- Criar bucket de storage para arquivos de projetos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  false,
  20971520, -- 20MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Tabela de histórico de projetos
CREATE TABLE IF NOT EXISTS public.project_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'status', 'nota', 'sistema'
  description TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de arquivos de projetos
CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de orçamentos detalhados
CREATE TABLE IF NOT EXISTS public.project_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ativar RLS nas novas tabelas
ALTER TABLE public.project_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_quotes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para project_history
CREATE POLICY "Autenticados podem ler histórico"
  ON public.project_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar histórico"
  ON public.project_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas RLS para project_files
CREATE POLICY "Autenticados podem ler arquivos"
  ON public.project_files FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar arquivos"
  ON public.project_files FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar arquivos"
  ON public.project_files FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Políticas RLS para project_quotes
CREATE POLICY "Autenticados podem ler orçamentos"
  ON public.project_quotes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar orçamentos"
  ON public.project_quotes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar orçamentos"
  ON public.project_quotes FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar orçamentos"
  ON public.project_quotes FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Políticas RLS para storage bucket project-files
CREATE POLICY "Autenticados podem visualizar arquivos de projetos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem fazer upload de arquivos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar arquivos de projetos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-files' AND auth.uid() IS NOT NULL);

-- RPC para agregados de projetos
CREATE OR REPLACE FUNCTION public.projects_aggregates()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'captado_count', COUNT(*) FILTER (WHERE stage = 'captado'),
    'orcamento_count', COUNT(*) FILTER (WHERE stage = 'orçamento'),
    'aprovado_count', COUNT(*) FILTER (WHERE stage = 'aprovado'),
    'perdido_count', COUNT(*) FILTER (WHERE stage = 'perdido')
  ) INTO result
  FROM projects;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- RPC para alertas de prazo
CREATE OR REPLACE FUNCTION public.project_deadline_alerts()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'near_due_count', COUNT(*) FILTER (WHERE sent_at IS NULL AND presented_at < NOW() + INTERVAL '7 days' AND stage IN ('captado', 'orçamento')),
    'overdue_count', COUNT(*) FILTER (WHERE sent_at IS NULL AND presented_at < NOW() AND stage IN ('captado', 'orçamento'))
  ) INTO result
  FROM projects;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;