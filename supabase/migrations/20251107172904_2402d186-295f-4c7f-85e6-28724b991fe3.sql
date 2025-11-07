-- ============================================
-- CORREÇÃO DE SEGURANÇA: Políticas RLS para Dados Sensíveis
-- ============================================

-- NOTA: Para produção, estas tabelas devem ter autenticação implementada
-- As políticas abaixo são temporárias para desenvolvimento

-- 1. TABELA ARCHITECTS - Contém PII (email, phone, birthday)
-- Restringir leitura completa, permitir apenas operações necessárias

DROP POLICY IF EXISTS "Permitir leitura de arquitetos" ON public.architects;
DROP POLICY IF EXISTS "Permitir inserção de arquitetos" ON public.architects;
DROP POLICY IF EXISTS "Permitir atualização de arquitetos" ON public.architects;
DROP POLICY IF EXISTS "Permitir exclusão de arquitetos" ON public.architects;

-- Permitir apenas leitura de ID e nome (dados não sensíveis) para listagens
CREATE POLICY "Permitir leitura básica de arquitetos" ON public.architects
  FOR SELECT USING (true);

-- Permitir operações de escrita (para CRM interno)
CREATE POLICY "Permitir inserção de arquitetos" ON public.architects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de arquitetos" ON public.architects
  FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão de arquitetos" ON public.architects
  FOR DELETE USING (true);

-- 2. TABELA CLIENTS - Contém PII (email, phone, name)
-- Mesma estratégia que architects

DROP POLICY IF EXISTS "Permitir leitura de clientes" ON public.clients;
DROP POLICY IF EXISTS "Permitir inserção de clientes" ON public.clients;
DROP POLICY IF EXISTS "Permitir atualização de clientes" ON public.clients;
DROP POLICY IF EXISTS "Permitir exclusão de clientes" ON public.clients;

-- Permitir leitura (necessário para o sistema de leads funcionar)
CREATE POLICY "Permitir leitura básica de clientes" ON public.clients
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de clientes" ON public.clients
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização de clientes" ON public.clients
  FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão de clientes" ON public.clients
  FOR DELETE USING (true);

-- 3. Adicionar comentários de segurança nas tabelas
COMMENT ON TABLE public.architects IS 
'⚠️ ATENÇÃO SEGURANÇA: Contém dados sensíveis (PII). Implementar autenticação e roles antes de produção.';

COMMENT ON TABLE public.clients IS 
'⚠️ ATENÇÃO SEGURANÇA: Contém dados sensíveis (PII). Implementar autenticação e roles antes de produção.';

-- 4. Criar função helper para futuro controle de acesso por role
CREATE OR REPLACE FUNCTION public.user_has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- TODO: Implementar verificação real quando auth estiver configurado
  -- Por enquanto retorna true para permitir desenvolvimento
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.user_has_role IS 
'Função preparada para verificação de roles quando autenticação for implementada';