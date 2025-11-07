-- ============================================
-- CRM KANBAN - ESTRUTURA COMPLETA
-- ============================================

-- Tabela de Funis (Pipelines)
CREATE TABLE public.crm_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Cadências
CREATE TABLE public.crm_cadences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Etapas dos Funis
CREATE TABLE public.crm_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  sla_hours INTEGER DEFAULT 24,
  cadence_id UUID REFERENCES public.crm_cadences(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Passos das Cadências
CREATE TABLE public.crm_cadence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cadence_id UUID NOT NULL REFERENCES public.crm_cadences(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  channel TEXT NOT NULL,
  wait_hours INTEGER DEFAULT 0,
  template TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Negócios (Deals)
CREATE TABLE public.crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE RESTRICT,
  stage_id UUID NOT NULL REFERENCES public.crm_stages(id) ON DELETE RESTRICT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE RESTRICT,
  architect_id UUID REFERENCES public.architects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'aberto',
  lost_reason TEXT,
  lost_note TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stage_position INTEGER DEFAULT 0,
  stage_entered_at TIMESTAMPTZ DEFAULT now(),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Arquivos dos Negócios
CREATE TABLE public.crm_deal_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Atividades
CREATE TABLE public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  note TEXT,
  by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Tarefas
CREATE TABLE public.crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  note TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'open',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_stage_entered_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    NEW.stage_entered_at = now();
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deal_stage_change
  BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stage_entered_at();

CREATE TRIGGER trg_pipeline_updated_at
  BEFORE UPDATE ON public.crm_pipelines
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_stage_updated_at
  BEFORE UPDATE ON public.crm_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_cadence_updated_at
  BEFORE UPDATE ON public.crm_cadences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_task_updated_at
  BEFORE UPDATE ON public.crm_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- FUNÇÕES RPC
-- ============================================

CREATE OR REPLACE FUNCTION public.crm_agg(
  p_pipeline_id UUID,
  p_start TIMESTAMPTZ DEFAULT now() - INTERVAL '30 days',
  p_end TIMESTAMPTZ DEFAULT now()
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'new_deals', COUNT(*) FILTER (WHERE created_at BETWEEN p_start AND p_end),
    'won_value', COALESCE(SUM(value) FILTER (WHERE status = 'won' AND updated_at BETWEEN p_start AND p_end), 0),
    'lost_value', COALESCE(SUM(value) FILTER (WHERE status = 'lost' AND updated_at BETWEEN p_start AND p_end), 0),
    'win_rate', CASE 
      WHEN COUNT(*) FILTER (WHERE status IN ('won', 'lost') AND updated_at BETWEEN p_start AND p_end) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE status = 'won' AND updated_at BETWEEN p_start AND p_end)::NUMERIC / 
                  COUNT(*) FILTER (WHERE status IN ('won', 'lost') AND updated_at BETWEEN p_start AND p_end)) * 100, 1)
      ELSE 0
    END,
    'avg_stage_time', COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (now() - stage_entered_at)) / 3600) FILTER (WHERE status = 'aberto'), 1), 0)
  ) INTO result
  FROM crm_deals
  WHERE pipeline_id = p_pipeline_id;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_sla_alerts(p_pipeline_id UUID)
RETURNS TABLE(
  deal_id UUID,
  title TEXT,
  lead_name TEXT,
  stage_name TEXT,
  delay_h NUMERIC,
  owner_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    d.id as deal_id,
    d.title,
    COALESCE(c.name, 'Sem cliente') as lead_name,
    s.name as stage_name,
    ROUND(EXTRACT(EPOCH FROM (now() - d.stage_entered_at)) / 3600, 1) as delay_h,
    COALESCE(p.full_name, p.email, 'Sem responsável') as owner_name
  FROM crm_deals d
  LEFT JOIN leads l ON l.id = d.lead_id
  LEFT JOIN clients c ON c.id = l.client_id
  LEFT JOIN crm_stages s ON s.id = d.stage_id
  LEFT JOIN profiles p ON p.id = d.owner_id
  WHERE d.pipeline_id = p_pipeline_id
    AND d.status = 'aberto'
    AND s.sla_hours IS NOT NULL
    AND EXTRACT(EPOCH FROM (now() - d.stage_entered_at)) / 3600 > s.sla_hours
  ORDER BY delay_h DESC;
$$;

CREATE OR REPLACE FUNCTION public.crm_stage_funnel(
  p_pipeline_id UUID,
  p_start TIMESTAMPTZ DEFAULT now() - INTERVAL '30 days',
  p_end TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE(stage TEXT, count BIGINT, value NUMERIC)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.name as stage,
    COUNT(d.id) as count,
    COALESCE(SUM(d.value), 0) as value
  FROM crm_stages s
  LEFT JOIN crm_deals d ON d.stage_id = s.id AND d.created_at BETWEEN p_start AND p_end
  WHERE s.pipeline_id = p_pipeline_id
  GROUP BY s.id, s.name, s.position
  ORDER BY s.position;
$$;

CREATE OR REPLACE FUNCTION public.crm_timeseries(
  p_pipeline_id UUID,
  p_metric TEXT DEFAULT 'deals'
)
RETURNS TABLE(period DATE, value BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    DATE(created_at) as period,
    COUNT(*) as value
  FROM crm_deals
  WHERE pipeline_id = p_pipeline_id
    AND created_at >= now() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
  ORDER BY period;
$$;

CREATE OR REPLACE FUNCTION public.crm_time_in_stage(p_pipeline_id UUID)
RETURNS TABLE(stage TEXT, avg_h NUMERIC)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.name as stage,
    COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (now() - d.stage_entered_at)) / 3600) FILTER (WHERE d.status = 'aberto'), 1), 0) as avg_h
  FROM crm_stages s
  LEFT JOIN crm_deals d ON d.stage_id = s.id
  WHERE s.pipeline_id = p_pipeline_id
  GROUP BY s.id, s.name, s.position
  ORDER BY s.position;
$$;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_cadences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_cadence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deal_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem pipelines" ON public.crm_pipelines FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados criam pipelines" ON public.crm_pipelines FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam pipelines" ON public.crm_pipelines FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins deletam pipelines" ON public.crm_pipelines FOR DELETE USING (is_admin());

CREATE POLICY "Autenticados leem stages" ON public.crm_stages FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados criam stages" ON public.crm_stages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam stages" ON public.crm_stages FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins deletam stages" ON public.crm_stages FOR DELETE USING (is_admin());

CREATE POLICY "Autenticados leem cadences" ON public.crm_cadences FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados criam cadences" ON public.crm_cadences FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam cadences" ON public.crm_cadences FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins deletam cadences" ON public.crm_cadences FOR DELETE USING (is_admin());

CREATE POLICY "Autenticados leem cadence_steps" ON public.crm_cadence_steps FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados criam cadence_steps" ON public.crm_cadence_steps FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam cadence_steps" ON public.crm_cadence_steps FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins deletam cadence_steps" ON public.crm_cadence_steps FOR DELETE USING (is_admin());

CREATE POLICY "Autenticados leem deals" ON public.crm_deals FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados criam deals" ON public.crm_deals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam deals" ON public.crm_deals FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins deletam deals" ON public.crm_deals FOR DELETE USING (is_admin());

CREATE POLICY "Autenticados leem deal_files" ON public.crm_deal_files FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados criam deal_files" ON public.crm_deal_files FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados deletam deal_files" ON public.crm_deal_files FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados leem activities" ON public.crm_activities FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados criam activities" ON public.crm_activities FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados leem tasks" ON public.crm_tasks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados criam tasks" ON public.crm_tasks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam tasks" ON public.crm_tasks FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados deletam tasks" ON public.crm_tasks FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================
-- DADOS INICIAIS
-- ============================================

INSERT INTO public.crm_pipelines (name) VALUES ('Funil de Vendas Padrão');

INSERT INTO public.crm_stages (pipeline_id, name, position, sla_hours)
SELECT id, 'Novo Lead', 0, 24 FROM public.crm_pipelines WHERE name = 'Funil de Vendas Padrão' LIMIT 1;

INSERT INTO public.crm_stages (pipeline_id, name, position, sla_hours)
SELECT id, 'Qualificação', 1, 48 FROM public.crm_pipelines WHERE name = 'Funil de Vendas Padrão' LIMIT 1;

INSERT INTO public.crm_stages (pipeline_id, name, position, sla_hours)
SELECT id, 'Proposta', 2, 72 FROM public.crm_pipelines WHERE name = 'Funil de Vendas Padrão' LIMIT 1;

INSERT INTO public.crm_stages (pipeline_id, name, position, sla_hours)
SELECT id, 'Negociação', 3, 48 FROM public.crm_pipelines WHERE name = 'Funil de Vendas Padrão' LIMIT 1;

INSERT INTO public.crm_stages (pipeline_id, name, position, sla_hours)
SELECT id, 'Fechamento', 4, 24 FROM public.crm_pipelines WHERE name = 'Funil de Vendas Padrão' LIMIT 1;