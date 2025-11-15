-- Criar tabela para dashboards personalizados
CREATE TABLE IF NOT EXISTS public.dashboards_personalizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  layout JSONB NOT NULL DEFAULT '{"widgets": []}'::jsonb,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_dashboards_user_id ON public.dashboards_personalizados(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_criado_em ON public.dashboards_personalizados(criado_em DESC);

-- RLS Policies
ALTER TABLE public.dashboards_personalizados ENABLE ROW LEVEL SECURITY;

-- Apenas MASTER pode criar dashboards
CREATE POLICY "Masters podem criar dashboards" ON public.dashboards_personalizados
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Usuários veem apenas seus próprios dashboards
CREATE POLICY "Usuários veem próprios dashboards" ON public.dashboards_personalizados
  FOR SELECT
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Usuários atualizam apenas seus próprios dashboards
CREATE POLICY "Usuários atualizam próprios dashboards" ON public.dashboards_personalizados
  FOR UPDATE
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Usuários deletam apenas seus próprios dashboards
CREATE POLICY "Usuários deletam próprios dashboards" ON public.dashboards_personalizados
  FOR DELETE
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION update_dashboards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dashboards_updated_at
  BEFORE UPDATE ON public.dashboards_personalizados
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboards_updated_at();