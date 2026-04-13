
-- Notifications table
CREATE TABLE public.erp_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  module TEXT NOT NULL CHECK (module IN ('comercial','financeiro','operacional','aprovacao','planejamento','sistema')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  entity_table TEXT,
  entity_id UUID,
  link_path TEXT,
  priority TEXT DEFAULT 'media' CHECK (priority IN ('baixa','media','alta','critica')),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  channel TEXT DEFAULT 'sistema' CHECK (channel IN ('sistema','email','push','whatsapp','webhook')),
  generated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.erp_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_notifications" ON public.erp_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_notifications" ON public.erp_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "authenticated_insert_notifications" ON public.erp_notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_erp_notifications_user ON public.erp_notifications(user_id, is_read);
CREATE INDEX idx_erp_notifications_module ON public.erp_notifications(module);
CREATE INDEX idx_erp_notifications_created ON public.erp_notifications(created_at DESC);

CREATE TRIGGER set_tenant_id_erp_notifications BEFORE INSERT ON public.erp_notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_notifications;

-- Tasks table
CREATE TABLE public.erp_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL,
  created_by_id UUID,
  module TEXT NOT NULL CHECK (module IN ('comercial','financeiro','operacional','aprovacao','planejamento','sistema')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  entity_table TEXT,
  entity_id UUID,
  link_path TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','aguardando_terceiro','concluida','cancelada','expirada')),
  priority TEXT DEFAULT 'media' CHECK (priority IN ('baixa','media','alta','critica')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.erp_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_assigned_tasks" ON public.erp_tasks
  FOR SELECT USING (auth.uid() = assignee_id OR auth.uid() = created_by_id);

CREATE POLICY "authenticated_insert_tasks" ON public.erp_tasks
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "assignee_update_tasks" ON public.erp_tasks
  FOR UPDATE USING (auth.uid() = assignee_id);

CREATE INDEX idx_erp_tasks_assignee ON public.erp_tasks(assignee_id, status);
CREATE INDEX idx_erp_tasks_due ON public.erp_tasks(due_date);
CREATE INDEX idx_erp_tasks_module ON public.erp_tasks(module);

CREATE TRIGGER set_tenant_id_erp_tasks BEFORE INSERT ON public.erp_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_tasks;
