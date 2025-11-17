-- Corrigir sistema de permissões

-- 1. Verificar e criar políticas RLS corretas para user_permissions
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can view all permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.user_permissions;

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

-- 2. Corrigir a função has_module_permission para realmente verificar permissões
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

-- 3. Criar função auxiliar para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_user_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'admin'
  );
$$;

-- 4. Garantir que a tabela user_permissions tenha RLS habilitado
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

COMMENT ON FUNCTION public.has_module_permission IS 'Verifica se usuário tem permissão para visualizar um módulo específico';
COMMENT ON FUNCTION public.is_user_admin IS 'Verifica se usuário é administrador do sistema';