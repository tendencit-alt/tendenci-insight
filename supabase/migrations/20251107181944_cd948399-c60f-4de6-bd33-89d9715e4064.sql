-- Adicionar campos faltantes na tabela architects
ALTER TABLE public.architects 
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'B' CHECK (tier IN ('A', 'B', 'C')),
  ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2) DEFAULT 10.00 CHECK (commission_percent >= 0 AND commission_percent <= 100),
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Criar tabela de arquivos do arquiteto
CREATE TABLE IF NOT EXISTS public.architect_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  architect_id UUID NOT NULL REFERENCES public.architects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id)
);

-- Criar tabela de histórico do arquiteto
CREATE TABLE IF NOT EXISTS public.architect_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  architect_id UUID NOT NULL REFERENCES public.architects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('nota', 'sistema', 'relacionamento')),
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.architect_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architect_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para architect_files
CREATE POLICY "Autenticados podem ler arquivos de arquitetos"
  ON public.architect_files FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar arquivos de arquitetos"
  ON public.architect_files FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar arquivos de arquitetos"
  ON public.architect_files FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Políticas RLS para architect_history
CREATE POLICY "Autenticados podem ler histórico de arquitetos"
  ON public.architect_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar histórico de arquitetos"
  ON public.architect_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_architect_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_architects_updated_at
  BEFORE UPDATE ON public.architects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_architect_updated_at();

-- Função RPC: Agregados de arquitetos
CREATE OR REPLACE FUNCTION public.architects_aggregates()
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'active_count', COUNT(*) FILTER (WHERE active = true),
    'projects_count', (SELECT COUNT(*) FROM projects WHERE architect_id IS NOT NULL),
    'approved_count', (SELECT COUNT(*) FROM projects WHERE stage = 'aprovado' AND architect_id IS NOT NULL),
    'approved_sum', COALESCE((SELECT SUM(value) FROM projects WHERE stage = 'aprovado' AND architect_id IS NOT NULL), 0),
    'birthdays_30d', COUNT(*) FILTER (
      WHERE birthday IS NOT NULL 
      AND active = true
      AND (
        (EXTRACT(MONTH FROM birthday) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM birthday) >= EXTRACT(DAY FROM CURRENT_DATE))
        OR
        (EXTRACT(MONTH FROM birthday) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '30 days') AND EXTRACT(DAY FROM birthday) <= EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '30 days'))
      )
    )
  ) INTO result
  FROM architects;

  RETURN result;
END;
$$;

-- Função RPC: Próximos aniversários (30 dias)
CREATE OR REPLACE FUNCTION public.architect_birthdays_upcoming()
RETURNS TABLE (
  id UUID,
  name TEXT,
  birthday DATE,
  city TEXT,
  tier TEXT,
  days_remaining INTEGER,
  phone TEXT,
  email TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.birthday,
    a.city,
    a.tier,
    (
      CASE 
        WHEN EXTRACT(MONTH FROM a.birthday) = EXTRACT(MONTH FROM CURRENT_DATE) 
             AND EXTRACT(DAY FROM a.birthday) >= EXTRACT(DAY FROM CURRENT_DATE)
        THEN (EXTRACT(DAY FROM a.birthday) - EXTRACT(DAY FROM CURRENT_DATE))::INTEGER
        ELSE (
          (DATE(EXTRACT(YEAR FROM CURRENT_DATE) + 1 || '-' || EXTRACT(MONTH FROM a.birthday) || '-' || EXTRACT(DAY FROM a.birthday)) - CURRENT_DATE)
        )::INTEGER
      END
    ) as days_remaining,
    a.phone,
    a.email
  FROM architects a
  WHERE a.birthday IS NOT NULL
    AND a.active = true
  ORDER BY days_remaining ASC
  LIMIT 10;
END;
$$;

-- Função RPC: Arquitetos inativos (sem projetos há X dias)
CREATE OR REPLACE FUNCTION public.architect_inactivity(days_threshold INTEGER DEFAULT 30)
RETURNS TABLE (
  id UUID,
  name TEXT,
  last_project_at TIMESTAMP WITH TIME ZONE,
  days_since_last INTEGER,
  contact_count BIGINT,
  phone TEXT,
  email TEXT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    a.id,
    a.name,
    MAX(p.created_at) as last_project_at,
    COALESCE(EXTRACT(DAY FROM NOW() - MAX(p.created_at))::INTEGER, 999) as days_since_last,
    COUNT(p.id) as contact_count,
    a.phone,
    a.email
  FROM architects a
  LEFT JOIN projects p ON p.architect_id = a.id
  WHERE a.active = true
  GROUP BY a.id, a.name, a.phone, a.email
  HAVING MAX(p.created_at) IS NULL 
    OR EXTRACT(DAY FROM NOW() - MAX(p.created_at)) >= days_threshold
  ORDER BY days_since_last DESC;
$$;

-- Função RPC: Contagem de projetos por arquiteto
CREATE OR REPLACE FUNCTION public.architect_projects_count()
RETURNS TABLE (
  name TEXT,
  count BIGINT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    a.name,
    COUNT(p.id) as count
  FROM architects a
  LEFT JOIN projects p ON p.architect_id = a.id
  WHERE a.active = true
  GROUP BY a.name
  ORDER BY count DESC
  LIMIT 10;
$$;

-- Função RPC: Valor aprovado por arquiteto
CREATE OR REPLACE FUNCTION public.architect_approved_value()
RETURNS TABLE (
  name TEXT,
  sum_value NUMERIC
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    a.name,
    COALESCE(SUM(p.value), 0) as sum_value
  FROM architects a
  LEFT JOIN projects p ON p.architect_id = a.id AND p.stage = 'aprovado'
  WHERE a.active = true
  GROUP BY a.name
  ORDER BY sum_value DESC
  LIMIT 10;
$$;

-- Trigger para log automático de criação de arquiteto
CREATE OR REPLACE FUNCTION public.log_architect_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.architect_history (architect_id, event_type, description, created_by)
  VALUES (
    NEW.id,
    'sistema',
    'Arquiteto cadastrado no sistema',
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS trigger_log_architect_creation ON public.architects;

CREATE TRIGGER trigger_log_architect_creation
  AFTER INSERT ON public.architects
  FOR EACH ROW
  EXECUTE FUNCTION public.log_architect_creation();