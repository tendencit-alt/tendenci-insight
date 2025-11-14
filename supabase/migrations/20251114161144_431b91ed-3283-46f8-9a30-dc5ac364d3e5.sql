-- Criar tabela para gerenciar etapas do funil de prospecção
CREATE TABLE IF NOT EXISTS public.tendenci_prospec_arq_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL,
  cor TEXT NOT NULL DEFAULT 'bg-gray-500',
  ativa BOOLEAN NOT NULL DEFAULT true,
  editavel BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.tendenci_prospec_arq_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem stages"
  ON public.tendenci_prospec_arq_stages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Masters criam stages"
  ON public.tendenci_prospec_arq_stages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Masters atualizam stages"
  ON public.tendenci_prospec_arq_stages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Masters deletam stages editáveis"
  ON public.tendenci_prospec_arq_stages FOR DELETE
  USING (
    editavel = true AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_prospec_stages_updated_at
  BEFORE UPDATE ON public.tendenci_prospec_arq_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prospec_updated_at();

-- Inserir etapas padrão (não editáveis as principais)
INSERT INTO public.tendenci_prospec_arq_stages (nome, slug, position, cor, editavel) VALUES
  ('Novo Arquiteto', 'novo_arquiteto', 0, 'bg-gray-500', false),
  ('Contato Iniciado', 'contato_iniciado', 1, 'bg-blue-500', true),
  ('Em Conversa', 'em_conversa', 2, 'bg-cyan-500', true),
  ('Interessado', 'interessado', 3, 'bg-orange-500', true),
  ('Reunião Agendada', 'reuniao_agendada', 4, 'bg-purple-500', true),
  ('Parceiro Ativo', 'parceiro_ativo', 5, 'bg-green-500', false),
  ('Sem Interesse', 'sem_interesse', 6, 'bg-red-500', false)
ON CONFLICT (slug) DO NOTHING;

-- Comentários
COMMENT ON TABLE public.tendenci_prospec_arq_stages IS 'Etapas configuráveis do funil de prospecção de arquitetos';
COMMENT ON COLUMN public.tendenci_prospec_arq_stages.editavel IS 'Se false, a etapa não pode ser deletada (etapas do sistema)';
COMMENT ON COLUMN public.tendenci_prospec_arq_stages.slug IS 'Identificador único usado no campo status_funil da tabela architects';