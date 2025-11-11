-- Criar tabela de atualizações da timeline do CRM
CREATE TABLE crm_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message TEXT NOT NULL,
  update_type TEXT NOT NULL DEFAULT 'Comentário Interno',
  mentioned_users UUID[] DEFAULT '{}',
  ai_summary TEXT,
  CONSTRAINT valid_update_type CHECK (update_type IN (
    'Comentário Interno',
    'Conversa WhatsApp',
    'Reunião / Ligação',
    'Visita / Projeto',
    'Observação IA'
  ))
);

-- Criar tabela de anexos da timeline
CREATE TABLE crm_timeline_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id UUID NOT NULL REFERENCES crm_timeline(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Criar bucket de storage para anexos da timeline
INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-timeline-attachments', 'crm-timeline-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS para crm_timeline
ALTER TABLE crm_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem timeline"
  ON crm_timeline FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados criam timeline"
  ON crm_timeline FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autores atualizam próprias entradas"
  ON crm_timeline FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Admins deletam timeline"
  ON crm_timeline FOR DELETE
  USING (is_admin());

-- RLS para crm_timeline_attachments
ALTER TABLE crm_timeline_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem attachments"
  ON crm_timeline_attachments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados criam attachments"
  ON crm_timeline_attachments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados deletam attachments"
  ON crm_timeline_attachments FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- RLS para storage bucket
CREATE POLICY "Autenticados visualizam arquivos timeline"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'crm-timeline-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados fazem upload timeline"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'crm-timeline-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados deletam arquivos timeline"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'crm-timeline-attachments' AND auth.uid() IS NOT NULL);

-- Habilitar realtime para timeline
ALTER PUBLICATION supabase_realtime ADD TABLE crm_timeline;