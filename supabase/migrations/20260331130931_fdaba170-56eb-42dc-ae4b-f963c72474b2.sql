
ALTER TABLE public.master_ideas
  DROP CONSTRAINT master_ideas_aprovado_por_fkey,
  ADD CONSTRAINT master_ideas_aprovado_por_fkey
    FOREIGN KEY (aprovado_por) REFERENCES auth.users(id) ON DELETE SET NULL;
