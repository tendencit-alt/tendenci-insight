
-- Storage bucket for ERP documents
INSERT INTO storage.buckets (id, name, public) VALUES ('erp-documents', 'erp-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'erp-documents');

CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'erp-documents');

CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'erp-documents');

-- Main documents table
CREATE TABLE public.erp_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('comercial','financeiro','operacional','estrutural','producao','aprovacao')),
  document_type TEXT NOT NULL CHECK (document_type IN ('fiscal','financeiro','contratual','operacional','comercial','comprovante','imagem','arquivo_tecnico')),
  entity_table TEXT NOT NULL,
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  mime_type TEXT,
  version INT DEFAULT 1,
  replaced_by UUID REFERENCES public.erp_documents(id),
  is_required BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  deleted_by UUID,
  deleted_at TIMESTAMPTZ,
  uploaded_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.erp_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_erp_documents" ON public.erp_documents
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_insert_erp_documents" ON public.erp_documents
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_update_erp_documents" ON public.erp_documents
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE INDEX idx_erp_documents_entity ON public.erp_documents(entity_table, entity_id);
CREATE INDEX idx_erp_documents_module ON public.erp_documents(module);
CREATE INDEX idx_erp_documents_type ON public.erp_documents(document_type);

CREATE TRIGGER set_tenant_id_erp_documents BEFORE INSERT ON public.erp_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- Document requirement rules
CREATE TABLE public.erp_document_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  entity_table TEXT NOT NULL,
  document_type TEXT NOT NULL,
  description TEXT,
  is_mandatory BOOLEAN DEFAULT false,
  condition_field TEXT,
  condition_operator TEXT CHECK (condition_operator IN ('>','<','>=','<=','=','!=')),
  condition_value TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.erp_document_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_erp_document_rules" ON public.erp_document_rules
  FOR ALL USING (tenant_id = public.get_user_tenant_id());

CREATE TRIGGER set_tenant_id_erp_document_rules BEFORE INSERT ON public.erp_document_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
