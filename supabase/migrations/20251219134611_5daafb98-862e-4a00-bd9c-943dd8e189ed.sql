-- =====================================================
-- TABELA CENTRALIZADA DE ATIVIDADES DO SISTEMA
-- =====================================================

CREATE TABLE public.system_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Quem fez a ação
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  
  -- O que aconteceu
  action_type TEXT NOT NULL,
  module TEXT NOT NULL,
  
  -- Contexto da ação
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_name TEXT,
  
  -- Detalhes
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Rastreamento
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_system_activities_created ON public.system_activities(created_at DESC);
CREATE INDEX idx_system_activities_module ON public.system_activities(module);
CREATE INDEX idx_system_activities_user ON public.system_activities(user_id);
CREATE INDEX idx_system_activities_action ON public.system_activities(action_type);
CREATE INDEX idx_system_activities_entity ON public.system_activities(entity_type, entity_id);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_activities;

-- =====================================================
-- RLS POLICIES - Apenas Masters podem ver
-- =====================================================

ALTER TABLE public.system_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Masters podem ver todas as atividades"
ON public.system_activities
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Sistema pode criar atividades"
ON public.system_activities
FOR INSERT
WITH CHECK (true);

-- =====================================================
-- TRIGGER: architect_timeline (Comentários na prospecção)
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_architect_timeline_to_activities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
  v_architect_name TEXT;
BEGIN
  -- Buscar nome do usuário
  SELECT full_name INTO v_user_name
  FROM profiles WHERE id = NEW.author_id;
  
  -- Buscar nome do arquiteto
  SELECT name INTO v_architect_name
  FROM architects WHERE id = NEW.architect_id;
  
  INSERT INTO system_activities (
    user_id, user_name, action_type, module, entity_type, entity_id,
    entity_name, description, metadata
  ) VALUES (
    NEW.author_id,
    COALESCE(v_user_name, 'Sistema'),
    'comment',
    'prospeccao',
    'architect',
    NEW.architect_id,
    COALESCE(v_architect_name, 'Arquiteto'),
    CONCAT(NEW.update_type, ': ', LEFT(NEW.message, 150)),
    jsonb_build_object('update_type', NEW.update_type, 'timeline_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_architect_timeline
AFTER INSERT ON public.architect_timeline
FOR EACH ROW EXECUTE FUNCTION public.log_architect_timeline_to_activities();

-- =====================================================
-- TRIGGER: crm_deal_history (Mudanças no CRM)
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_crm_deal_history_to_activities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
  v_deal_title TEXT;
BEGIN
  -- Buscar nome do usuário
  SELECT full_name INTO v_user_name
  FROM profiles WHERE id = NEW.moved_by;
  
  -- Buscar título do deal
  SELECT title INTO v_deal_title
  FROM crm_deals WHERE id = NEW.deal_id;
  
  INSERT INTO system_activities (
    user_id, user_name, action_type, module, entity_type, entity_id,
    entity_name, description, old_value, new_value, metadata
  ) VALUES (
    NEW.moved_by,
    COALESCE(v_user_name, 'Sistema'),
    COALESCE(NEW.action_type, 'deal_update'),
    'crm',
    'deal',
    NEW.deal_id,
    COALESCE(v_deal_title, 'Negócio'),
    COALESCE(NEW.description, 'Atualização no negócio'),
    NEW.old_value,
    NEW.new_value,
    jsonb_build_object('field_name', NEW.field_name, 'history_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_crm_deal_history
AFTER INSERT ON public.crm_deal_history
FOR EACH ROW EXECUTE FUNCTION public.log_crm_deal_history_to_activities();

-- =====================================================
-- TRIGGER: crm_tasks (Tarefas do CRM)
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_crm_tasks_to_activities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
  v_deal_title TEXT;
  v_action TEXT;
  v_description TEXT;
BEGIN
  -- Buscar nome do usuário
  SELECT full_name INTO v_user_name
  FROM profiles WHERE id = COALESCE(NEW.created_by, auth.uid());
  
  -- Buscar título do deal
  SELECT title INTO v_deal_title
  FROM crm_deals WHERE id = NEW.deal_id;
  
  IF TG_OP = 'INSERT' THEN
    v_action := 'task_created';
    v_description := CONCAT('Nova tarefa: ', NEW.title);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'concluida' AND (OLD.status IS NULL OR OLD.status != 'concluida') THEN
      v_action := 'task_completed';
      v_description := CONCAT('Tarefa concluída: ', NEW.title);
    ELSIF NEW.status = 'cancelada' AND (OLD.status IS NULL OR OLD.status != 'cancelada') THEN
      v_action := 'task_cancelled';
      v_description := CONCAT('Tarefa cancelada: ', NEW.title);
    ELSE
      v_action := 'task_updated';
      v_description := CONCAT('Tarefa atualizada: ', NEW.title);
    END IF;
  END IF;
  
  INSERT INTO system_activities (
    user_id, user_name, action_type, module, entity_type, entity_id,
    entity_name, description, metadata
  ) VALUES (
    COALESCE(NEW.created_by, auth.uid()),
    COALESCE(v_user_name, 'Sistema'),
    v_action,
    'crm',
    'task',
    NEW.id,
    NEW.title,
    v_description,
    jsonb_build_object('deal_id', NEW.deal_id, 'deal_title', v_deal_title, 'status', NEW.status, 'tipo_tarefa', NEW.tipo_tarefa)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_crm_tasks
AFTER INSERT OR UPDATE ON public.crm_tasks
FOR EACH ROW EXECUTE FUNCTION public.log_crm_tasks_to_activities();

-- =====================================================
-- TRIGGER: architect_history (Histórico de arquitetos)
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_architect_history_to_activities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
  v_architect_name TEXT;
BEGIN
  -- Buscar nome do usuário
  SELECT full_name INTO v_user_name
  FROM profiles WHERE id = NEW.created_by;
  
  -- Buscar nome do arquiteto
  SELECT name INTO v_architect_name
  FROM architects WHERE id = NEW.architect_id;
  
  INSERT INTO system_activities (
    user_id, user_name, action_type, module, entity_type, entity_id,
    entity_name, description, old_value, new_value, metadata
  ) VALUES (
    NEW.created_by,
    COALESCE(v_user_name, 'Sistema'),
    COALESCE(NEW.event_type, 'architect_update'),
    'prospeccao',
    'architect',
    NEW.architect_id,
    COALESCE(v_architect_name, 'Arquiteto'),
    NEW.description,
    NEW.old_value,
    NEW.new_value,
    jsonb_build_object('field_name', NEW.field_name, 'history_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_architect_history
AFTER INSERT ON public.architect_history
FOR EACH ROW EXECUTE FUNCTION public.log_architect_history_to_activities();

-- =====================================================
-- TRIGGER: production_logs (Logs de produção)
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_production_to_activities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
  v_order_number TEXT;
BEGIN
  -- Buscar nome do usuário
  SELECT full_name INTO v_user_name
  FROM profiles WHERE id = NEW.created_by;
  
  -- Buscar número da ordem
  SELECT order_number INTO v_order_number
  FROM production_orders WHERE id = NEW.production_order_id;
  
  INSERT INTO system_activities (
    user_id, user_name, action_type, module, entity_type, entity_id,
    entity_name, description, old_value, new_value, metadata
  ) VALUES (
    NEW.created_by,
    COALESCE(v_user_name, 'Sistema'),
    NEW.action_type,
    'producao',
    'production_order',
    NEW.production_order_id,
    COALESCE(v_order_number, 'Ordem'),
    NEW.description,
    NEW.from_status,
    NEW.to_status,
    NEW.metadata
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_production
AFTER INSERT ON public.production_logs
FOR EACH ROW EXECUTE FUNCTION public.log_production_to_activities();

-- =====================================================
-- TRIGGER: order_history (Histórico de pedidos)
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_order_history_to_activities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
  v_order_number TEXT;
BEGIN
  -- Buscar nome do usuário
  SELECT full_name INTO v_user_name
  FROM profiles WHERE id = NEW.created_by;
  
  -- Buscar número do pedido
  SELECT order_number::TEXT INTO v_order_number
  FROM orders WHERE id = NEW.order_id;
  
  INSERT INTO system_activities (
    user_id, user_name, action_type, module, entity_type, entity_id,
    entity_name, description, old_value, new_value, metadata
  ) VALUES (
    NEW.created_by,
    COALESCE(v_user_name, 'Sistema'),
    NEW.action_type,
    'pedidos',
    'order',
    NEW.order_id,
    CONCAT('Pedido #', COALESCE(v_order_number, 'N/A')),
    COALESCE(NEW.description, 'Atualização no pedido'),
    NEW.old_value,
    NEW.new_value,
    jsonb_build_object('field_name', NEW.field_name, 'history_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_order_history
AFTER INSERT ON public.order_history
FOR EACH ROW EXECUTE FUNCTION public.log_order_history_to_activities();

-- =====================================================
-- TRIGGER: crm_timeline (Timeline do CRM)
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_crm_timeline_to_activities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
  v_deal_title TEXT;
BEGIN
  -- Buscar nome do usuário
  SELECT full_name INTO v_user_name
  FROM profiles WHERE id = NEW.author_id;
  
  -- Buscar título do deal
  SELECT title INTO v_deal_title
  FROM crm_deals WHERE id = NEW.deal_id;
  
  INSERT INTO system_activities (
    user_id, user_name, action_type, module, entity_type, entity_id,
    entity_name, description, metadata
  ) VALUES (
    NEW.author_id,
    COALESCE(v_user_name, 'Sistema'),
    'crm_comment',
    'crm',
    'deal',
    NEW.deal_id,
    COALESCE(v_deal_title, 'Negócio'),
    CONCAT(NEW.update_type, ': ', LEFT(NEW.message, 150)),
    jsonb_build_object('update_type', NEW.update_type, 'timeline_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_crm_timeline
AFTER INSERT ON public.crm_timeline
FOR EACH ROW EXECUTE FUNCTION public.log_crm_timeline_to_activities();

-- =====================================================
-- TRIGGER: tendenci_prospec_arq_agendamentos (Tarefas de prospecção)
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_prospec_agendamentos_to_activities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name TEXT;
  v_architect_name TEXT;
  v_action TEXT;
  v_description TEXT;
BEGIN
  -- Buscar nome do usuário
  SELECT full_name INTO v_user_name
  FROM profiles WHERE id = NEW.vendedor_id;
  
  -- Buscar nome do arquiteto
  SELECT name INTO v_architect_name
  FROM architects WHERE id = NEW.architect_id;
  
  IF TG_OP = 'INSERT' THEN
    v_action := 'prospec_task_created';
    v_description := CONCAT('Nova tarefa agendada: ', NEW.tipo_tarefa, ' para ', COALESCE(v_architect_name, 'arquiteto'));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'concluida' AND (OLD.status IS NULL OR OLD.status != 'concluida') THEN
      v_action := 'prospec_task_completed';
      v_description := CONCAT('Tarefa concluída: ', NEW.tipo_tarefa, ' para ', COALESCE(v_architect_name, 'arquiteto'));
    ELSE
      v_action := 'prospec_task_updated';
      v_description := CONCAT('Tarefa atualizada: ', NEW.tipo_tarefa);
    END IF;
  END IF;
  
  INSERT INTO system_activities (
    user_id, user_name, action_type, module, entity_type, entity_id,
    entity_name, description, metadata
  ) VALUES (
    NEW.vendedor_id,
    COALESCE(v_user_name, 'Sistema'),
    v_action,
    'prospeccao',
    'prospec_task',
    NEW.id,
    COALESCE(v_architect_name, 'Tarefa'),
    v_description,
    jsonb_build_object('architect_id', NEW.architect_id, 'tipo_tarefa', NEW.tipo_tarefa, 'status', NEW.status, 'data_agendamento', NEW.data_agendamento)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_prospec_agendamentos
AFTER INSERT OR UPDATE ON public.tendenci_prospec_arq_agendamentos
FOR EACH ROW EXECUTE FUNCTION public.log_prospec_agendamentos_to_activities();