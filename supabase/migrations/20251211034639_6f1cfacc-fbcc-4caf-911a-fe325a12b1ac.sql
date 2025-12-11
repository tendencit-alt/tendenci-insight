
-- =====================================================
-- MÓDULO DE PRODUÇÃO - Kanban Configurável por Tipo
-- =====================================================

-- 1. TIPOS DE PRODUÇÃO (Planejado, Rústico, Industrial)
CREATE TABLE public.production_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT NOT NULL DEFAULT 'bg-blue-500',
  icon TEXT DEFAULT 'hammer',
  active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. FASES CONFIGURÁVEIS POR TIPO DE PRODUÇÃO
CREATE TABLE public.production_phase_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_type_id UUID NOT NULL REFERENCES public.production_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT 'bg-gray-500',
  position INTEGER NOT NULL DEFAULT 0,
  sla_hours INTEGER,
  is_start_phase BOOLEAN NOT NULL DEFAULT false,
  is_end_phase BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(production_type_id, slug)
);

-- 3. ORDENS DE PRODUÇÃO (OPs)
CREATE TABLE public.production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  production_type_id UUID NOT NULL REFERENCES public.production_types(id),
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  specifications JSONB DEFAULT '{}',
  responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  current_phase_id UUID,
  status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'em_producao', 'pausado', 'concluido', 'cancelado')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
  planned_start_date TIMESTAMPTZ,
  planned_end_date TIMESTAMPTZ,
  actual_start_date TIMESTAMPTZ,
  actual_end_date TIMESTAMPTZ,
  value NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. INSTÂNCIAS DE FASES POR OP
CREATE TABLE public.production_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  phase_template_id UUID NOT NULL REFERENCES public.production_phase_templates(id),
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'pausado', 'concluido')),
  responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_ids UUID[] DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_hours NUMERIC,
  actual_hours NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar FK de current_phase_id após criar production_phases
ALTER TABLE public.production_orders 
ADD CONSTRAINT production_orders_current_phase_id_fkey 
FOREIGN KEY (current_phase_id) REFERENCES public.production_phases(id) ON DELETE SET NULL;

-- 5. LOGS DE PRODUÇÃO (Histórico)
CREATE TABLE public.production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  production_phase_id UUID REFERENCES public.production_phases(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'phase_started', 'phase_completed', 'phase_change', 'status_change', 'assigned', 'note_added', 'attachment_added')),
  from_phase_id UUID REFERENCES public.production_phase_templates(id),
  to_phase_id UUID REFERENCES public.production_phase_templates(id),
  from_status TEXT,
  to_status TEXT,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ANEXOS DAS OPs
CREATE TABLE public.production_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX idx_production_orders_type ON public.production_orders(production_type_id);
CREATE INDEX idx_production_orders_status ON public.production_orders(status);
CREATE INDEX idx_production_orders_deal ON public.production_orders(deal_id);
CREATE INDEX idx_production_orders_client ON public.production_orders(client_id);
CREATE INDEX idx_production_orders_responsible ON public.production_orders(responsible_id);
CREATE INDEX idx_production_phases_order ON public.production_phases(production_order_id);
CREATE INDEX idx_production_phases_template ON public.production_phases(phase_template_id);
CREATE INDEX idx_production_phases_status ON public.production_phases(status);
CREATE INDEX idx_production_logs_order ON public.production_logs(production_order_id);
CREATE INDEX idx_production_logs_created ON public.production_logs(created_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.production_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_phase_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_attachments ENABLE ROW LEVEL SECURITY;

-- production_types - todos autenticados podem ler, apenas admins gerenciam
CREATE POLICY "Autenticados leem tipos de produção" ON public.production_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins gerenciam tipos de produção" ON public.production_types FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- production_phase_templates - todos autenticados podem ler, apenas admins gerenciam
CREATE POLICY "Autenticados leem templates de fases" ON public.production_phase_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins gerenciam templates de fases" ON public.production_phase_templates FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- production_orders - CRUD para autenticados
CREATE POLICY "Autenticados leem OPs" ON public.production_orders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados criam OPs" ON public.production_orders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam OPs" ON public.production_orders FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins deletam OPs" ON public.production_orders FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- production_phases - CRUD para autenticados
CREATE POLICY "Autenticados leem fases" ON public.production_phases FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados criam fases" ON public.production_phases FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam fases" ON public.production_phases FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Sistema pode deletar fases" ON public.production_phases FOR DELETE USING (auth.uid() IS NOT NULL);

-- production_logs - leitura para autenticados, inserção automática
CREATE POLICY "Autenticados leem logs" ON public.production_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Sistema cria logs" ON public.production_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- production_attachments - CRUD para autenticados
CREATE POLICY "Autenticados leem anexos" ON public.production_attachments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados criam anexos" ON public.production_attachments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados deletam anexos" ON public.production_attachments FOR DELETE USING (auth.uid() IS NOT NULL);

-- =====================================================
-- TRIGGERS AUTOMÁTICOS
-- =====================================================

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_production_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_production_types_updated_at BEFORE UPDATE ON public.production_types FOR EACH ROW EXECUTE FUNCTION update_production_updated_at();
CREATE TRIGGER update_production_phase_templates_updated_at BEFORE UPDATE ON public.production_phase_templates FOR EACH ROW EXECUTE FUNCTION update_production_updated_at();
CREATE TRIGGER update_production_orders_updated_at BEFORE UPDATE ON public.production_orders FOR EACH ROW EXECUTE FUNCTION update_production_updated_at();
CREATE TRIGGER update_production_phases_updated_at BEFORE UPDATE ON public.production_phases FOR EACH ROW EXECUTE FUNCTION update_production_updated_at();

-- Trigger para criar fases automaticamente quando OP é criada
CREATE OR REPLACE FUNCTION public.create_production_phases_on_op_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_template RECORD;
  v_first_phase_id UUID;
BEGIN
  -- Criar instâncias de fases baseadas nos templates do tipo de produção
  FOR v_template IN 
    SELECT id, position, is_start_phase 
    FROM production_phase_templates 
    WHERE production_type_id = NEW.production_type_id AND active = true
    ORDER BY position ASC
  LOOP
    INSERT INTO production_phases (
      production_order_id, 
      phase_template_id, 
      position,
      status
    ) VALUES (
      NEW.id, 
      v_template.id, 
      v_template.position,
      CASE WHEN v_template.is_start_phase THEN 'em_andamento' ELSE 'pendente' END
    )
    RETURNING id INTO v_first_phase_id;
    
    -- Guardar o ID da primeira fase para definir como current_phase_id
    IF v_template.is_start_phase THEN
      UPDATE production_orders SET current_phase_id = v_first_phase_id WHERE id = NEW.id;
    END IF;
  END LOOP;
  
  -- Log de criação
  INSERT INTO production_logs (production_order_id, action_type, description, created_by)
  VALUES (NEW.id, 'created', 'Ordem de Produção criada: ' || NEW.title, NEW.created_by);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_phases_on_op_insert 
AFTER INSERT ON public.production_orders 
FOR EACH ROW EXECUTE FUNCTION create_production_phases_on_op_insert();

-- Trigger para logar mudanças de fase
CREATE OR REPLACE FUNCTION public.log_production_phase_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando status muda para em_andamento, registrar início
  IF NEW.status = 'em_andamento' AND (OLD.status IS NULL OR OLD.status != 'em_andamento') THEN
    NEW.started_at = COALESCE(NEW.started_at, now());
    
    INSERT INTO production_logs (production_order_id, production_phase_id, action_type, to_status, description, created_by)
    VALUES (NEW.production_order_id, NEW.id, 'phase_started', NEW.status, 
            'Fase iniciada', auth.uid());
  END IF;
  
  -- Quando status muda para concluido, registrar término
  IF NEW.status = 'concluido' AND OLD.status != 'concluido' THEN
    NEW.completed_at = COALESCE(NEW.completed_at, now());
    
    INSERT INTO production_logs (production_order_id, production_phase_id, action_type, from_status, to_status, description, created_by)
    VALUES (NEW.production_order_id, NEW.id, 'phase_completed', OLD.status, NEW.status, 
            'Fase concluída', auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_phase_changes 
BEFORE UPDATE ON public.production_phases 
FOR EACH ROW EXECUTE FUNCTION log_production_phase_changes();

-- Trigger para atualizar status da OP quando fase final é concluída
CREATE OR REPLACE FUNCTION public.update_op_status_on_phase_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_is_end_phase BOOLEAN;
  v_all_phases_done BOOLEAN;
BEGIN
  IF NEW.status = 'concluido' AND OLD.status != 'concluido' THEN
    -- Verificar se é fase final
    SELECT is_end_phase INTO v_is_end_phase 
    FROM production_phase_templates 
    WHERE id = NEW.phase_template_id;
    
    IF v_is_end_phase THEN
      -- Marcar OP como concluída
      UPDATE production_orders 
      SET status = 'concluido', actual_end_date = now()
      WHERE id = NEW.production_order_id;
    ELSE
      -- Verificar se todas as fases estão concluídas
      SELECT NOT EXISTS (
        SELECT 1 FROM production_phases 
        WHERE production_order_id = NEW.production_order_id AND status != 'concluido'
      ) INTO v_all_phases_done;
      
      IF v_all_phases_done THEN
        UPDATE production_orders 
        SET status = 'concluido', actual_end_date = now()
        WHERE id = NEW.production_order_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_op_on_phase_complete 
AFTER UPDATE ON public.production_phases 
FOR EACH ROW EXECUTE FUNCTION update_op_status_on_phase_complete();

-- =====================================================
-- DADOS INICIAIS - TIPOS DE PRODUÇÃO
-- =====================================================
INSERT INTO public.production_types (name, slug, description, color, icon, position) VALUES
('Móveis Planejados', 'planejado', 'Móveis sob medida com projeto personalizado', 'bg-blue-500', 'ruler', 1),
('Móveis Rústicos', 'rustico', 'Móveis em madeira maciça estilo rústico', 'bg-amber-600', 'trees', 2),
('Móveis Industriais', 'industrial', 'Móveis com estrutura metálica estilo industrial', 'bg-slate-600', 'factory', 3);

-- =====================================================
-- DADOS INICIAIS - FASES POR TIPO
-- =====================================================

-- Fases para PLANEJADO (9 fases)
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Início / Projeto', 'inicio_projeto', 'bg-purple-500', 1, 48, true, false FROM production_types WHERE slug = 'planejado';
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Aguardando Obra', 'aguardando_obra', 'bg-yellow-500', 2, NULL, false, false FROM production_types WHERE slug = 'planejado';
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Medição', 'medicao', 'bg-orange-500', 3, 24, false, false FROM production_types WHERE slug = 'planejado';
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Caderno Executivo', 'caderno_executivo', 'bg-cyan-500', 4, 72, false, false FROM production_types WHERE slug = 'planejado';
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Corte', 'corte', 'bg-red-500', 5, 48, false, false FROM production_types WHERE slug = 'planejado';
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Fitagem', 'fitagem', 'bg-pink-500', 6, 24, false, false FROM production_types WHERE slug = 'planejado';
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Montagem Interna', 'montagem_interna', 'bg-indigo-500', 7, 72, false, false FROM production_types WHERE slug = 'planejado';
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Expedição / Montagem Externa', 'expedicao', 'bg-teal-500', 8, 48, false, false FROM production_types WHERE slug = 'planejado';
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Concluído', 'concluido', 'bg-green-500', 9, NULL, false, true FROM production_types WHERE slug = 'planejado';

-- Fases para RÚSTICO (6 fases)
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Projeto', 'projeto', 'bg-purple-500', 1, 24, true, false FROM production_types WHERE slug = 'rustico';
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Corte / Preparação', 'corte', 'bg-red-500', 2, 48, false, false FROM production_types WHERE slug = 'rustico';
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Montagem', 'montagem', 'bg-indigo-500', 3, 72, false, false FROM production_types WHERE slug = 'rustico';
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Acabamento', 'acabamento', 'bg-amber-500', 4, 48, false, false FROM production_types WHERE slug = 'rustico';
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Expedição', 'expedicao', 'bg-teal-500', 5, 24, false, false FROM production_types WHERE slug = 'rustico';
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Concluído', 'concluido', 'bg-green-500', 6, NULL, false, true FROM production_types WHERE slug = 'rustico';

-- Fases para INDUSTRIAL (5 fases)
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Projeto', 'projeto', 'bg-purple-500', 1, 24, true, false FROM production_types WHERE slug = 'industrial';
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Corte / Solda', 'corte_solda', 'bg-red-500', 2, 48, false, false FROM production_types WHERE slug = 'industrial';
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Pintura', 'pintura', 'bg-orange-500', 3, 48, false, false FROM production_types WHERE slug = 'industrial';
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Montagem', 'montagem', 'bg-indigo-500', 4, 24, false, false FROM production_types WHERE slug = 'industrial';
INSERT INTO public.production_phase_templates (production_type_id, name, slug, color, position, sla_hours, is_start_phase, is_end_phase) 
SELECT id, 'Concluído', 'concluido', 'bg-green-500', 5, NULL, false, true FROM production_types WHERE slug = 'industrial';

-- =====================================================
-- HABILITAR REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.production_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.production_phases;
