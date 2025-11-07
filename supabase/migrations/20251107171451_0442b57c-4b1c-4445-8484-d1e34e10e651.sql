-- Criar bucket de storage para anexos de leads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-attachments',
  'lead-attachments',
  false,
  20971520, -- 20MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
);

-- Criar tabela de anexos de leads
CREATE TABLE IF NOT EXISTS public.lead_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID
);

-- Enable RLS
ALTER TABLE public.lead_attachments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para lead_attachments
CREATE POLICY "Permitir leitura para autenticados" ON public.lead_attachments
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserção para autenticados" ON public.lead_attachments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir exclusão para autenticados" ON public.lead_attachments
  FOR DELETE USING (true);

-- Políticas de storage para lead-attachments
CREATE POLICY "Permitir leitura de anexos autenticados" ON storage.objects
  FOR SELECT USING (bucket_id = 'lead-attachments');

CREATE POLICY "Permitir upload de anexos autenticados" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'lead-attachments');

CREATE POLICY "Permitir exclusão de anexos autenticados" ON storage.objects
  FOR DELETE USING (bucket_id = 'lead-attachments');

-- Adicionar índice para performance
CREATE INDEX idx_lead_attachments_lead_id ON public.lead_attachments(lead_id);