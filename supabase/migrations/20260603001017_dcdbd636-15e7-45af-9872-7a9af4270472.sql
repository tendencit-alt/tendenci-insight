-- Per-item observations
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS observacao TEXT;

-- Linhas de "Informação Complementar" exibidas junto aos itens
CREATE TABLE public.order_extra_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL DEFAULT 'Informação Complementar',
  observacao TEXT,
  position INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_extra_info TO authenticated;
GRANT ALL ON public.order_extra_info TO service_role;

ALTER TABLE public.order_extra_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_extra_info_select ON public.order_extra_info
  FOR SELECT USING (is_owner() OR tenant_rls_check(tenant_id));
CREATE POLICY order_extra_info_modify ON public.order_extra_info
  FOR ALL USING (is_owner() OR tenant_rls_check(tenant_id))
  WITH CHECK (is_owner() OR tenant_rls_check(tenant_id));

CREATE INDEX order_extra_info_order_idx ON public.order_extra_info(order_id);

CREATE TRIGGER trg_order_extra_info_updated
BEFORE UPDATE ON public.order_extra_info
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Anexos por item OU por linha de informação complementar
CREATE TABLE public.order_item_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
  extra_info_id UUID REFERENCES public.order_extra_info(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((order_item_id IS NOT NULL)::int + (extra_info_id IS NOT NULL)::int = 1)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_item_attachments TO authenticated;
GRANT ALL ON public.order_item_attachments TO service_role;

ALTER TABLE public.order_item_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY oia_select ON public.order_item_attachments
  FOR SELECT USING (is_owner() OR tenant_rls_check(tenant_id));
CREATE POLICY oia_modify ON public.order_item_attachments
  FOR ALL USING (is_owner() OR tenant_rls_check(tenant_id))
  WITH CHECK (is_owner() OR tenant_rls_check(tenant_id));

CREATE INDEX oia_order_idx ON public.order_item_attachments(order_id);
CREATE INDEX oia_item_idx ON public.order_item_attachments(order_item_id);
CREATE INDEX oia_extra_idx ON public.order_item_attachments(extra_info_id);

-- Políticas no bucket 'order-item-files' (estrutura: {tenant_id}/{order_id}/...)
CREATE POLICY "order-item-files select" ON storage.objects FOR SELECT
USING (bucket_id = 'order-item-files' AND (is_owner() OR tenant_rls_check(((storage.foldername(name))[1])::uuid)));
CREATE POLICY "order-item-files insert" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'order-item-files' AND (is_owner() OR tenant_rls_check(((storage.foldername(name))[1])::uuid)));
CREATE POLICY "order-item-files update" ON storage.objects FOR UPDATE
USING (bucket_id = 'order-item-files' AND (is_owner() OR tenant_rls_check(((storage.foldername(name))[1])::uuid)));
CREATE POLICY "order-item-files delete" ON storage.objects FOR DELETE
USING (bucket_id = 'order-item-files' AND (is_owner() OR tenant_rls_check(((storage.foldername(name))[1])::uuid)));