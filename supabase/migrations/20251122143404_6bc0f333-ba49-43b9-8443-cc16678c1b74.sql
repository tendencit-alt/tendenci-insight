-- Permitir que usuários autenticados (incluindo vendedores) editem projetos
DROP POLICY IF EXISTS "Autenticados podem atualizar projetos" ON public.projects;

CREATE POLICY "Autenticados podem atualizar projetos"
ON public.projects
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Adicionar comentário explicativo
COMMENT ON POLICY "Autenticados podem atualizar projetos" ON public.projects IS 
'Permite que todos os usuários autenticados (incluindo vendedores) possam editar projetos. A autenticação garante que apenas usuários válidos do sistema tenham acesso.';