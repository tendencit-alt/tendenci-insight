-- 1️⃣ Adicionar coluna deadline se não existir
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE;

-- 2️⃣ Garantir CASCADE DELETE em todos os relacionamentos
-- Remover constraints antigas se existirem e recriar com CASCADE
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS projects_deal_id_fkey,
DROP CONSTRAINT IF EXISTS projects_architect_id_fkey,
DROP CONSTRAINT IF EXISTS projects_client_id_fkey;

ALTER TABLE public.projects
ADD CONSTRAINT projects_deal_id_fkey 
  FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE CASCADE,
ADD CONSTRAINT projects_architect_id_fkey 
  FOREIGN KEY (architect_id) REFERENCES public.architects(id) ON DELETE SET NULL,
ADD CONSTRAINT projects_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- 3️⃣ Atualizar função de alertas para usar deadline correto
CREATE OR REPLACE FUNCTION public.project_deadline_alerts()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'near_due_count', COUNT(*) FILTER (
      WHERE deadline IS NOT NULL 
      AND deadline BETWEEN NOW() AND NOW() + INTERVAL '7 days' 
      AND stage IN ('captado', 'orçamento')
    ),
    'overdue_count', COUNT(*) FILTER (
      WHERE deadline IS NOT NULL 
      AND deadline < NOW() 
      AND stage IN ('captado', 'orçamento')
    )
  ) INTO result
  FROM projects;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 4️⃣ Função para registrar histórico automaticamente
CREATE OR REPLACE FUNCTION public.log_project_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log de criação
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_history (project_id, event_type, description, created_by)
    VALUES (
      NEW.id,
      'sistema',
      'Projeto criado no estágio: ' || NEW.stage,
      auth.uid()
    );
    RETURN NEW;
  END IF;

  -- Log de mudança de estágio
  IF TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.project_history (project_id, event_type, description, created_by)
    VALUES (
      NEW.id,
      'status',
      'Estágio alterado de "' || OLD.stage || '" para "' || NEW.stage || '"',
      auth.uid()
    );
  END IF;

  -- Log de mudança de deadline
  IF TG_OP = 'UPDATE' AND OLD.deadline IS DISTINCT FROM NEW.deadline THEN
    INSERT INTO public.project_history (project_id, event_type, description, created_by)
    VALUES (
      NEW.id,
      'nota',
      CASE 
        WHEN NEW.deadline IS NULL THEN 'Prazo removido'
        WHEN OLD.deadline IS NULL THEN 'Prazo definido para ' || TO_CHAR(NEW.deadline, 'DD/MM/YYYY')
        ELSE 'Prazo alterado para ' || TO_CHAR(NEW.deadline, 'DD/MM/YYYY')
      END,
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5️⃣ Criar trigger para log automático
DROP TRIGGER IF EXISTS projects_change_log ON public.projects;
CREATE TRIGGER projects_change_log
  AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.log_project_change();

-- 6️⃣ Índices para performance
CREATE INDEX IF NOT EXISTS idx_projects_stage ON public.projects(stage);
CREATE INDEX IF NOT EXISTS idx_projects_deadline ON public.projects(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON public.project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_quotes_project_id ON public.project_quotes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_history_project_id ON public.project_history(project_id);

-- 7️⃣ View materializada para relatórios rápidos (opcional)
CREATE OR REPLACE VIEW public.projects_overview AS
SELECT 
  p.id,
  p.name,
  p.stage,
  p.value,
  p.deadline,
  p.created_at,
  c.name as client_name,
  c.phone as client_phone,
  a.name as architect_name,
  COUNT(DISTINCT pf.id) as files_count,
  COUNT(DISTINCT pq.id) as quotes_count,
  SUM(pq.total) as quotes_total
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN architects a ON p.architect_id = a.id
LEFT JOIN project_files pf ON p.id = pf.project_id
LEFT JOIN project_quotes pq ON p.id = pq.project_id
GROUP BY p.id, p.name, p.stage, p.value, p.deadline, p.created_at, c.name, c.phone, a.name;