-- Criar enum para módulos do sistema
CREATE TYPE public.app_module AS ENUM (
  'dashboard',
  'prospeccao',
  'crm',
  'projetos',
  'metas',
  'leads',
  'dashboards_personalizados',
  'gestao_usuarios'
);

-- Criar tabela de permissões por usuário e módulo
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module public.app_module NOT NULL,
  can_view boolean DEFAULT false NOT NULL,
  can_create boolean DEFAULT false NOT NULL,
  can_edit boolean DEFAULT false NOT NULL,
  can_delete boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module)
);

-- Habilitar RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Criar função SECURITY DEFINER para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_user_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
    AND role = 'admin'
  )
$$;

-- Criar função SECURITY DEFINER para verificar permissão em módulo
CREATE OR REPLACE FUNCTION public.user_can_access_module(_user_id uuid, _module app_module)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_permissions
    WHERE user_id = _user_id
    AND module = _module
    AND can_view = true
  ) OR public.is_user_admin(_user_id)
$$;

-- Policies para user_permissions
CREATE POLICY "Admins podem ver todas permissões"
ON public.user_permissions
FOR SELECT
TO authenticated
USING (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins podem inserir permissões"
ON public.user_permissions
FOR INSERT
TO authenticated
WITH CHECK (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar permissões"
ON public.user_permissions
FOR UPDATE
TO authenticated
USING (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins podem deletar permissões"
ON public.user_permissions
FOR DELETE
TO authenticated
USING (public.is_user_admin(auth.uid()));

-- Criar função para inicializar permissões padrão ao criar usuário
CREATE OR REPLACE FUNCTION public.initialize_user_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se for vendedor, dar permissões básicas
  IF NEW.role = 'vendedor' THEN
    INSERT INTO public.user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
    VALUES
      (NEW.id, 'dashboard', true, false, false, false),
      (NEW.id, 'prospeccao', true, true, true, false),
      (NEW.id, 'crm', true, true, true, false),
      (NEW.id, 'projetos', true, true, true, false),
      (NEW.id, 'metas', true, false, false, false),
      (NEW.id, 'leads', true, true, true, false);
  -- Se for arquiteto, dar permissões limitadas
  ELSIF NEW.role = 'arquiteto' THEN
    INSERT INTO public.user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
    VALUES
      (NEW.id, 'dashboard', true, false, false, false),
      (NEW.id, 'projetos', true, false, false, false);
  END IF;
  -- Admins não precisam de permissões, têm acesso total
  RETURN NEW;
END;
$$;

-- Trigger para inicializar permissões ao criar usuário
CREATE TRIGGER on_user_created_initialize_permissions
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_permissions();

-- Inicializar permissões para usuários existentes que não são admins
INSERT INTO public.user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
SELECT 
  p.id,
  m.module,
  CASE 
    WHEN p.role = 'vendedor' THEN true
    WHEN p.role = 'arquiteto' AND m.module IN ('dashboard', 'projetos') THEN true
    ELSE false
  END as can_view,
  CASE 
    WHEN p.role = 'vendedor' AND m.module IN ('prospeccao', 'crm', 'projetos', 'leads') THEN true
    ELSE false
  END as can_create,
  CASE 
    WHEN p.role = 'vendedor' AND m.module IN ('prospeccao', 'crm', 'projetos', 'leads') THEN true
    ELSE false
  END as can_edit,
  false as can_delete
FROM public.profiles p
CROSS JOIN (
  SELECT unnest(enum_range(NULL::app_module)) as module
) m
WHERE p.role != 'admin'
ON CONFLICT (user_id, module) DO NOTHING;