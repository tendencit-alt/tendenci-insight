-- Ajustar políticas RLS da tabela architects também
DROP POLICY IF EXISTS "Permitir atualização para autenticados" ON public.architects;
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.architects;
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.architects;

CREATE POLICY "Permitir leitura de arquitetos" ON public.architects
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de arquitetos" ON public.architects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de arquitetos" ON public.architects
  FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão de arquitetos" ON public.architects
  FOR DELETE USING (true);