-- Corrigir sistema de permissões - versão corrigida

-- 1. Remover TODAS as políticas existentes da tabela user_permissions
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_permissions') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.user_permissions';
    END LOOP;
END $$;

-- 2. Criar políticas RLS corretas para user_permissions
-- Permitir usuários verem suas próprias permissões
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Permitir admins verem todas as permissões
CREATE POLICY "Admins can view all permissions"
ON public.user_permissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Permitir admins gerenciarem permissões
CREATE POLICY "Admins can insert permissions"
ON public.user_permissions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update permissions"
ON public.user_permissions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete permissions"
ON public.user_permissions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. Corrigir a função has_module_permission para realmente verificar permissões
CREATE OR REPLACE FUNCTION public.has_module_permission(_user_id uuid, _module text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    -- Admins têm acesso a tudo
    WHEN EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = _user_id AND role = 'admin'
    ) THEN true
    -- Verificar permissão específica do módulo
    WHEN EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = _user_id 
        AND module = _module::app_module
        AND can_view = true
    ) THEN true
    ELSE false
  END;
$$;

-- 4. Garantir que a tabela user_permissions tenha RLS habilitado
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

COMMENT ON FUNCTION public.has_module_permission IS 'Verifica se usuário tem permissão para visualizar um módulo específico';