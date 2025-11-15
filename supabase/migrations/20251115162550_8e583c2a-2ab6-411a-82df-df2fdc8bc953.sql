-- Create architect_timeline table for collaborative timeline
CREATE TABLE IF NOT EXISTS public.architect_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  architect_id UUID NOT NULL REFERENCES public.architects(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  message TEXT NOT NULL,
  update_type TEXT NOT NULL DEFAULT 'Comentário Interno',
  mentioned_users UUID[] DEFAULT '{}',
  ai_summary TEXT,
  CONSTRAINT architect_timeline_update_type_check CHECK (update_type IN ('Comentário Interno', 'Reunião / Ligação', 'Visita / Projeto', 'Conversa WhatsApp', 'Observação IA'))
);

-- Create architect_timeline_attachments table
CREATE TABLE IF NOT EXISTS public.architect_timeline_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timeline_id UUID NOT NULL REFERENCES public.architect_timeline(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.architect_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architect_timeline_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for architect_timeline
CREATE POLICY "Autenticados podem ler timeline de arquitetos"
  ON public.architect_timeline FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar entradas na timeline"
  ON public.architect_timeline FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autores podem atualizar suas próprias entradas"
  ON public.architect_timeline FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Admins podem deletar entradas da timeline"
  ON public.architect_timeline FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for architect_timeline_attachments
CREATE POLICY "Autenticados podem ler anexos da timeline"
  ON public.architect_timeline_attachments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar anexos"
  ON public.architect_timeline_attachments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar anexos"
  ON public.architect_timeline_attachments FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_architect_timeline_architect_id ON public.architect_timeline(architect_id);
CREATE INDEX IF NOT EXISTS idx_architect_timeline_created_at ON public.architect_timeline(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_architect_timeline_author_id ON public.architect_timeline(author_id);
CREATE INDEX IF NOT EXISTS idx_architect_timeline_attachments_timeline_id ON public.architect_timeline_attachments(timeline_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.architect_timeline;
ALTER PUBLICATION supabase_realtime ADD TABLE public.architect_timeline_attachments;