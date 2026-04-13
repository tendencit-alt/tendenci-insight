
-- =============================================
-- ORÇAMENTOS (Quotes)
-- =============================================
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  quote_number SERIAL,
  client_id UUID REFERENCES public.clients(id),
  seller_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  total_value NUMERIC(15,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_value NUMERIC(15,2) DEFAULT 0,
  final_value NUMERIC(15,2) DEFAULT 0,
  validity_date DATE,
  payment_condition TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  order_id UUID REFERENCES public.orders(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_tenant_isolation" ON public.quotes
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "quotes_authenticated_access" ON public.quotes
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER set_quotes_tenant_id
  BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ITENS DO ORÇAMENTO
-- =============================================
CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(15,2) DEFAULT 0,
  total_price NUMERIC(15,2) DEFAULT 0,
  cost_center TEXT,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_items_via_quote" ON public.quote_items
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.tenant_id = public.get_user_tenant_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.tenant_id = public.get_user_tenant_id())
  );

-- =============================================
-- CONTRATOS (Contracts)
-- =============================================
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  contract_number SERIAL,
  client_id UUID REFERENCES public.clients(id),
  order_id UUID REFERENCES public.orders(id),
  quote_id UUID REFERENCES public.quotes(id),
  title TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'venda',
  total_value NUMERIC(15,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  payment_condition TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  signed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_tenant_isolation" ON public.contracts
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "contracts_authenticated_access" ON public.contracts
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER set_contracts_tenant_id
  BEFORE INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PROJETOS OPERACIONAIS
-- =============================================
CREATE TABLE IF NOT EXISTS public.operational_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  order_id UUID REFERENCES public.orders(id),
  contract_id UUID REFERENCES public.contracts(id),
  cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  project_id UUID REFERENCES public.fin_projects(id),
  responsible_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'aguardando_liberacao',
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.operational_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "op_projects_tenant_isolation" ON public.operational_projects
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "op_projects_authenticated_access" ON public.operational_projects
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER set_op_projects_tenant_id
  BEFORE INSERT ON public.operational_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER update_op_projects_updated_at
  BEFORE UPDATE ON public.operational_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- EVENTOS CROSS-MÓDULO
-- =============================================
CREATE TABLE IF NOT EXISTS public.cross_module_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  event_type TEXT NOT NULL,
  source_module TEXT NOT NULL,
  target_module TEXT NOT NULL,
  source_entity TEXT NOT NULL,
  source_entity_id UUID NOT NULL,
  target_entity TEXT,
  target_entity_id UUID,
  payload JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pendente',
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cross_module_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cross_events_tenant_isolation" ON public.cross_module_events
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "cross_events_authenticated_access" ON public.cross_module_events
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER set_cross_events_tenant_id
  BEFORE INSERT ON public.cross_module_events
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE INDEX idx_cross_events_source ON public.cross_module_events(source_module, source_entity, source_entity_id);
CREATE INDEX idx_cross_events_target ON public.cross_module_events(target_module, target_entity, target_entity_id);
CREATE INDEX idx_cross_events_status ON public.cross_module_events(status);
CREATE INDEX idx_cross_events_type ON public.cross_module_events(event_type);

-- =============================================
-- ADICIONAR VÍNCULOS NA TABELA ORDERS
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'quote_id') THEN
    ALTER TABLE public.orders ADD COLUMN quote_id UUID REFERENCES public.quotes(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'contract_id') THEN
    ALTER TABLE public.orders ADD COLUMN contract_id UUID REFERENCES public.contracts(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'operational_project_id') THEN
    ALTER TABLE public.orders ADD COLUMN operational_project_id UUID REFERENCES public.operational_projects(id);
  END IF;
END $$;

-- =============================================
-- FUNÇÃO: REGISTRAR EVENTO CROSS-MÓDULO
-- =============================================
CREATE OR REPLACE FUNCTION public.register_cross_module_event(
  p_event_type TEXT,
  p_source_module TEXT,
  p_target_module TEXT,
  p_source_entity TEXT,
  p_source_entity_id UUID,
  p_target_entity TEXT DEFAULT NULL,
  p_target_entity_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_tenant_id UUID;
BEGIN
  SELECT get_user_tenant_id() INTO v_tenant_id;
  
  INSERT INTO public.cross_module_events (
    tenant_id, event_type, source_module, target_module,
    source_entity, source_entity_id, target_entity, target_entity_id,
    payload, created_by
  ) VALUES (
    v_tenant_id, p_event_type, p_source_module, p_target_module,
    p_source_entity, p_source_entity_id, p_target_entity, p_target_entity_id,
    p_payload, auth.uid()
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- =============================================
-- TRIGGER: PEDIDO APROVADO → EVENTOS AUTOMÁTICOS
-- =============================================
CREATE OR REPLACE FUNCTION public.on_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_op_id UUID;
BEGIN
  -- Pedido aprovado
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    -- Evento: Comercial → Operacional
    PERFORM register_cross_module_event(
      'pedido_aprovado', 'comercial', 'operacional',
      'orders', NEW.id, NULL, NULL,
      jsonb_build_object('order_number', NEW.order_number, 'client_id', NEW.client_id)
    );
    
    -- Evento: Comercial → Financeiro (provisões)
    PERFORM register_cross_module_event(
      'pedido_aprovado', 'comercial', 'financeiro',
      'orders', NEW.id, NULL, NULL,
      jsonb_build_object('order_number', NEW.order_number, 'total_value', NEW.total_value)
    );
    
    -- Criar projeto operacional automaticamente
    INSERT INTO public.operational_projects (
      tenant_id, name, client_id, order_id, responsible_id, status, created_by
    ) VALUES (
      NEW.tenant_id,
      'Projeto - Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text),
      NEW.client_id,
      NEW.id,
      NEW.seller_id,
      'aguardando_liberacao',
      auth.uid()
    ) RETURNING id INTO v_op_id;
    
    -- Vincular projeto ao pedido
    UPDATE public.orders SET operational_project_id = v_op_id WHERE id = NEW.id;
  END IF;
  
  -- Pedido cancelado
  IF NEW.status = 'cancelado' AND OLD.status != 'cancelado' THEN
    PERFORM register_cross_module_event(
      'pedido_cancelado', 'comercial', 'operacional',
      'orders', NEW.id, NULL, NULL,
      jsonb_build_object('order_number', NEW.order_number)
    );
    PERFORM register_cross_module_event(
      'pedido_cancelado', 'comercial', 'financeiro',
      'orders', NEW.id, NULL, NULL,
      jsonb_build_object('order_number', NEW.order_number)
    );
    
    -- Cancelar projetos operacionais vinculados
    UPDATE public.operational_projects 
    SET status = 'cancelado', updated_at = now()
    WHERE order_id = NEW.id AND status NOT IN ('concluido', 'entregue');
  END IF;
  
  -- Pedido faturado
  IF NEW.status = 'faturado' AND OLD.status != 'faturado' THEN
    PERFORM register_cross_module_event(
      'pedido_faturado', 'comercial', 'financeiro',
      'orders', NEW.id, NULL, NULL,
      jsonb_build_object('order_number', NEW.order_number, 'total_value', NEW.total_value)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Dropar trigger antigo se existir e criar novo
DROP TRIGGER IF EXISTS trg_order_status_change ON public.orders;
CREATE TRIGGER trg_order_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.on_order_status_change();

-- =============================================
-- TRIGGER: PRODUÇÃO CONCLUÍDA → EVENTO
-- =============================================
CREATE OR REPLACE FUNCTION public.on_production_order_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'concluida' AND (OLD.status IS NULL OR OLD.status != 'concluida') THEN
    -- Atualizar projeto operacional
    UPDATE public.operational_projects
    SET status = 'concluido', actual_end = now()::date, updated_at = now()
    WHERE order_id = (
      SELECT oi.order_id FROM public.order_items oi WHERE oi.id = NEW.order_item_id
    );
    
    -- Registrar evento
    PERFORM register_cross_module_event(
      'producao_concluida', 'operacional', 'comercial',
      'production_orders', NEW.id, 'orders', 
      (SELECT oi.order_id FROM public.order_items oi WHERE oi.id = NEW.order_item_id),
      jsonb_build_object('production_type', NEW.production_type_id)
    );
    
    PERFORM register_cross_module_event(
      'producao_concluida', 'operacional', 'financeiro',
      'production_orders', NEW.id, NULL, NULL,
      jsonb_build_object('libera_faturamento', true)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_production_completed ON public.production_orders;
CREATE TRIGGER trg_production_completed
  AFTER UPDATE OF status ON public.production_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.on_production_order_completed();
