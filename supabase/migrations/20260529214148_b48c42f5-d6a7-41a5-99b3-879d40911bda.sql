
CREATE TABLE public.production_status_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'slate',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX idx_psc_tenant ON public.production_status_columns(tenant_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_status_columns TO authenticated;
GRANT ALL ON public.production_status_columns TO service_role;

ALTER TABLE public.production_status_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psc_select_tenant"
ON public.production_status_columns FOR SELECT
TO authenticated
USING (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE POLICY "psc_insert_tenant"
ON public.production_status_columns FOR INSERT
TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE POLICY "psc_update_tenant"
ON public.production_status_columns FOR UPDATE
TO authenticated
USING (tenant_id = public.get_user_tenant_id() OR public.is_owner())
WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE POLICY "psc_delete_tenant"
ON public.production_status_columns FOR DELETE
TO authenticated
USING ((tenant_id = public.get_user_tenant_id() OR public.is_owner()) AND is_system = false);

CREATE TRIGGER trg_psc_updated_at
BEFORE UPDATE ON public.production_status_columns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.production_status_columns (tenant_id, slug, label, color, sort_order, is_system)
SELECT t.id, v.slug, v.label, v.color, v.sort_order, true
FROM public.tenants t
CROSS JOIN (VALUES
  ('aguardando','Aguardando','blue',10),
  ('em_producao','Em Produção','amber',20),
  ('concluido','Concluído','emerald',30),
  ('entregue','Entregue','green',40),
  ('cancelado','Cancelado','slate',50)
) AS v(slug,label,color,sort_order)
ON CONFLICT (tenant_id, slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.seed_production_status_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.production_status_columns (tenant_id, slug, label, color, sort_order, is_system)
  VALUES
    (NEW.id,'aguardando','Aguardando','blue',10,true),
    (NEW.id,'em_producao','Em Produção','amber',20,true),
    (NEW.id,'concluido','Concluído','emerald',30,true),
    (NEW.id,'entregue','Entregue','green',40,true),
    (NEW.id,'cancelado','Cancelado','slate',50,true)
  ON CONFLICT (tenant_id, slug) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_psc_on_tenant ON public.tenants;
CREATE TRIGGER trg_seed_psc_on_tenant
AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.seed_production_status_columns();
