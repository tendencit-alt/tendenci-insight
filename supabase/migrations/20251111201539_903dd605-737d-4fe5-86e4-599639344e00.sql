-- Remover política restritiva de DELETE em leads
DROP POLICY IF EXISTS "Apenas admins podem deletar leads" ON public.leads;

-- Criar nova política permitindo usuários autenticados deletarem leads
CREATE POLICY "Autenticados podem deletar leads"
ON public.leads
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);