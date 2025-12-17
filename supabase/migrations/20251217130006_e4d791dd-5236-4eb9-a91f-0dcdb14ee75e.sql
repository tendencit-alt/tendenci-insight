-- Adicionar novos campos à tabela master_ideas
ALTER TABLE public.master_ideas 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'em_pauta',
ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'geral',
ADD COLUMN IF NOT EXISTS aprovado_por UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS motivo_recusa TEXT;

-- Adicionar constraints
ALTER TABLE public.master_ideas
ADD CONSTRAINT master_ideas_status_check 
  CHECK (status IN ('em_pauta', 'aprovada', 'recusada', 'implementada'));

ALTER TABLE public.master_ideas
ADD CONSTRAINT master_ideas_categoria_check 
  CHECK (categoria IN ('marketing', 'producao', 'vendas', 'financeiro', 'geral'));

-- Remover política antiga de admin apenas
DROP POLICY IF EXISTS "Admins can manage master ideas" ON public.master_ideas;

-- Novas políticas RLS para todos usuários
CREATE POLICY "Todos podem ver ideias" 
ON public.master_ideas 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Todos podem criar ideias" 
ON public.master_ideas 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Autor ou admin pode editar ideia" 
ON public.master_ideas 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = created_by OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admin pode deletar ideias" 
ON public.master_ideas 
FOR DELETE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

-- Atualizar RLS de master_idea_attachments para todos
DROP POLICY IF EXISTS "Admins can manage master idea attachments" ON public.master_idea_attachments;

CREATE POLICY "Todos podem ver anexos de ideias" 
ON public.master_idea_attachments 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Todos podem criar anexos" 
ON public.master_idea_attachments 
FOR INSERT 
TO authenticated 
WITH CHECK (EXISTS (
  SELECT 1 FROM master_ideas WHERE id = idea_id AND created_by = auth.uid()
) OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Autor ou admin pode deletar anexos" 
ON public.master_idea_attachments 
FOR DELETE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM master_ideas WHERE id = idea_id AND created_by = auth.uid()
) OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

-- Atualizar políticas do bucket storage
DROP POLICY IF EXISTS "Admin view master ideas files" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload master ideas files" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete master ideas files" ON storage.objects;

CREATE POLICY "Autenticados veem arquivos ideias"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'master-ideas-files');

CREATE POLICY "Autenticados fazem upload arquivos ideias"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'master-ideas-files');

CREATE POLICY "Autenticados deletam próprios arquivos ideias"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'master-ideas-files');