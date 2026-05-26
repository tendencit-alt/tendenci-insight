
-- ============================================================
-- Module: Entregas & Montagem (Deliveries & Installation)
-- Pattern: tenant_id NOT NULL + set_tenant_id trigger + tenant_rls_check
-- ============================================================

-- 1) delivery_orders
CREATE TABLE IF NOT EXISTS public.delivery_orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  order_id            uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  production_order_id uuid REFERENCES public.production_orders(id) ON DELETE SET NULL,
  code                text,
  status              text NOT NULL DEFAULT 'pendente'
                       CHECK (status IN ('pendente','agendada','em_transito','entregue','cancelada')),
  scheduled_date      timestamptz,
  delivered_date      timestamptz,
  endereco            text,
  transportadora      text,
  veiculo             text,
  motorista           text,
  proof_file_url      text,
  recebido_por        text,
  observacoes         text,
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_orders TO authenticated;
GRANT ALL ON public.delivery_orders TO service_role;
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_delivery_orders_set_tenant
  BEFORE INSERT ON public.delivery_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE POLICY delivery_orders_select ON public.delivery_orders
  FOR SELECT TO authenticated
  USING (public.is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY delivery_orders_insert ON public.delivery_orders
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY delivery_orders_update ON public.delivery_orders
  FOR UPDATE TO authenticated
  USING (public.is_owner() OR public.tenant_rls_check(tenant_id))
  WITH CHECK (public.is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY admin_only_delete ON public.delivery_orders
  FOR DELETE TO authenticated
  USING (public.is_tenant_admin(tenant_id));

CREATE INDEX idx_delivery_orders_tenant      ON public.delivery_orders(tenant_id);
CREATE INDEX idx_delivery_orders_order       ON public.delivery_orders(order_id);
CREATE INDEX idx_delivery_orders_status      ON public.delivery_orders(status);

-- 2) installation_orders
CREATE TABLE IF NOT EXISTS public.installation_orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  order_id            uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_order_id   uuid REFERENCES public.delivery_orders(id) ON DELETE SET NULL,
  status              text NOT NULL DEFAULT 'pendente'
                       CHECK (status IN ('pendente','agendada','em_andamento','concluida','com_pendencia','cancelada')),
  scheduled_date      timestamptz,
  completed_date      timestamptz,
  equipe_responsavel  text,
  endereco            text,
  observacoes         text,
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installation_orders TO authenticated;
GRANT ALL ON public.installation_orders TO service_role;
ALTER TABLE public.installation_orders ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_installation_orders_set_tenant
  BEFORE INSERT ON public.installation_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE POLICY installation_orders_select ON public.installation_orders
  FOR SELECT TO authenticated
  USING (public.is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY installation_orders_insert ON public.installation_orders
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY installation_orders_update ON public.installation_orders
  FOR UPDATE TO authenticated
  USING (public.is_owner() OR public.tenant_rls_check(tenant_id))
  WITH CHECK (public.is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY admin_only_delete ON public.installation_orders
  FOR DELETE TO authenticated
  USING (public.is_tenant_admin(tenant_id));

CREATE INDEX idx_installation_orders_tenant   ON public.installation_orders(tenant_id);
CREATE INDEX idx_installation_orders_order    ON public.installation_orders(order_id);
CREATE INDEX idx_installation_orders_status   ON public.installation_orders(status);

-- 3) installation_checklist_items
CREATE TABLE IF NOT EXISTS public.installation_checklist_items (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL,
  installation_order_id   uuid NOT NULL REFERENCES public.installation_orders(id) ON DELETE CASCADE,
  descricao               text NOT NULL,
  concluido               boolean NOT NULL DEFAULT false,
  observacao              text,
  created_at              timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installation_checklist_items TO authenticated;
GRANT ALL ON public.installation_checklist_items TO service_role;
ALTER TABLE public.installation_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_installation_checklist_items_set_tenant
  BEFORE INSERT ON public.installation_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE POLICY installation_checklist_items_select ON public.installation_checklist_items
  FOR SELECT TO authenticated
  USING (public.is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY installation_checklist_items_insert ON public.installation_checklist_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY installation_checklist_items_update ON public.installation_checklist_items
  FOR UPDATE TO authenticated
  USING (public.is_owner() OR public.tenant_rls_check(tenant_id))
  WITH CHECK (public.is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY admin_only_delete ON public.installation_checklist_items
  FOR DELETE TO authenticated
  USING (public.is_any_tenant_admin());

CREATE INDEX idx_install_checklist_install ON public.installation_checklist_items(installation_order_id);

-- 4) installation_issues
CREATE TABLE IF NOT EXISTS public.installation_issues (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL,
  installation_order_id   uuid NOT NULL REFERENCES public.installation_orders(id) ON DELETE CASCADE,
  descricao               text NOT NULL,
  severidade              text NOT NULL DEFAULT 'media' CHECK (severidade IN ('baixa','media','alta')),
  status                  text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','resolvida')),
  foto_url                text,
  created_at              timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installation_issues TO authenticated;
GRANT ALL ON public.installation_issues TO service_role;
ALTER TABLE public.installation_issues ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_installation_issues_set_tenant
  BEFORE INSERT ON public.installation_issues
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE POLICY installation_issues_select ON public.installation_issues
  FOR SELECT TO authenticated
  USING (public.is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY installation_issues_insert ON public.installation_issues
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY installation_issues_update ON public.installation_issues
  FOR UPDATE TO authenticated
  USING (public.is_owner() OR public.tenant_rls_check(tenant_id))
  WITH CHECK (public.is_owner() OR public.tenant_rls_check(tenant_id));
CREATE POLICY admin_only_delete ON public.installation_issues
  FOR DELETE TO authenticated
  USING (public.is_any_tenant_admin());

CREATE INDEX idx_install_issues_install ON public.installation_issues(installation_order_id);
CREATE INDEX idx_install_issues_status  ON public.installation_issues(status);

-- updated_at touch trigger using existing function
CREATE TRIGGER trg_delivery_orders_updated_at
  BEFORE UPDATE ON public.delivery_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_installation_orders_updated_at
  BEFORE UPDATE ON public.installation_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
