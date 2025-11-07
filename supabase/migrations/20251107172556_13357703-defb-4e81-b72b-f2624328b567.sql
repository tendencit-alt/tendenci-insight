-- Ajustar políticas RLS da tabela clients para permitir operações
-- Remover políticas antigas
DROP POLICY IF EXISTS "Permitir atualização para autenticados" ON public.clients;
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.clients;
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.clients;

-- Criar novas políticas mais permissivas (temporário até implementar auth)
CREATE POLICY "Permitir leitura de clientes" ON public.clients
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de clientes" ON public.clients
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de clientes" ON public.clients
  FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão de clientes" ON public.clients
  FOR DELETE USING (true);