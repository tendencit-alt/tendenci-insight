-- Create storage bucket for master ideas files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('master-ideas-files', 'master-ideas-files', true);

-- RLS: only admins can manage master ideas files
CREATE POLICY "Admins can view master ideas files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'master-ideas-files' AND EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can upload master ideas files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'master-ideas-files' AND EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can delete master ideas files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'master-ideas-files' AND EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

-- Create table for attachments
CREATE TABLE public.master_idea_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES public.master_ideas(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'audio')),
  transcription TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.master_idea_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for attachments - admin only
CREATE POLICY "Admins can manage master idea attachments"
ON public.master_idea_attachments FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));