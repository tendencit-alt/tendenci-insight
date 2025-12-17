
-- Tabela de avaliações (5 estrelas)
CREATE TABLE public.master_idea_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES public.master_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(idea_id, user_id)
);

-- Tabela de comentários
CREATE TABLE public.master_idea_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES public.master_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.master_idea_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_master_idea_ratings_idea_id ON public.master_idea_ratings(idea_id);
CREATE INDEX idx_master_idea_ratings_user_id ON public.master_idea_ratings(user_id);
CREATE INDEX idx_master_idea_comments_idea_id ON public.master_idea_comments(idea_id);
CREATE INDEX idx_master_idea_comments_parent_id ON public.master_idea_comments(parent_id);

-- RLS para ratings
ALTER TABLE public.master_idea_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver avaliações"
ON public.master_idea_ratings FOR SELECT
USING (true);

CREATE POLICY "Usuários autenticados podem avaliar"
ON public.master_idea_ratings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar própria avaliação"
ON public.master_idea_ratings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar própria avaliação"
ON public.master_idea_ratings FOR DELETE
USING (auth.uid() = user_id);

-- RLS para comments
ALTER TABLE public.master_idea_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver comentários"
ON public.master_idea_comments FOR SELECT
USING (true);

CREATE POLICY "Usuários autenticados podem comentar"
ON public.master_idea_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar próprio comentário"
ON public.master_idea_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar próprio comentário"
ON public.master_idea_comments FOR DELETE
USING (auth.uid() = user_id);

-- Função para verificar se usuário pode deletar ideias
CREATE OR REPLACE FUNCTION public.can_delete_master_idea()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email IN ('csoares_felipe@hotmail.com', 'matheus@tendenci.com.br')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar policy de DELETE em master_ideas para usar emails específicos
DROP POLICY IF EXISTS "Autor ou admin pode deletar anexos" ON public.master_idea_attachments;
DROP POLICY IF EXISTS "Autor ou admin pode deletar ideia" ON public.master_ideas;

CREATE POLICY "Emails autorizados podem deletar ideias"
ON public.master_ideas FOR DELETE
USING (public.can_delete_master_idea());

CREATE POLICY "Emails autorizados podem deletar anexos"
ON public.master_idea_attachments FOR DELETE
USING (public.can_delete_master_idea());

-- Habilitar realtime para as novas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.master_idea_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.master_idea_comments;

-- Trigger para updated_at em ratings
CREATE OR REPLACE FUNCTION public.update_master_idea_rating_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_master_idea_ratings_updated_at
BEFORE UPDATE ON public.master_idea_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_master_idea_rating_updated_at();

-- Trigger para updated_at em comments
CREATE TRIGGER update_master_idea_comments_updated_at
BEFORE UPDATE ON public.master_idea_comments
FOR EACH ROW EXECUTE FUNCTION public.update_master_idea_rating_updated_at();
