-- Adicionar coluna de prioridade na tabela master_ideas
-- 1 = Crítica, 2 = Alta, 3 = Média, 4 = Baixa, 5 = Sugestão
ALTER TABLE public.master_ideas ADD COLUMN IF NOT EXISTS prioridade integer DEFAULT 3;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.master_ideas.prioridade IS 'Prioridade da ideia: 1=Crítica, 2=Alta, 3=Média, 4=Baixa, 5=Sugestão';