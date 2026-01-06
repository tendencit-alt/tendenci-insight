-- Criar tabela de tipos de perfil
CREATE TABLE public.profile_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  color text DEFAULT '#6B7280',
  icon text DEFAULT 'user',
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profile_types ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profile_types
CREATE POLICY "Authenticated users can view active profile types"
ON public.profile_types FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage profile types"
ON public.profile_types FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Inserir tipos de perfil existentes como "de sistema"
INSERT INTO public.profile_types (name, display_name, description, color, icon, is_system, is_active) VALUES
  ('admin', 'Master', 'Acesso total ao sistema', '#7C3AED', 'shield', true, true),
  ('vendedor', 'Vendedor', 'Usuário de vendas', '#10B981', 'user', true, true),
  ('arquiteto', 'Arquiteto', 'Arquiteto parceiro', '#8B5CF6', 'palette', true, true),
  ('projetista', 'Projetista', 'Projetista de móveis', '#3B82F6', 'ruler', true, true);

-- Criar tabela de permissões padrão por tipo de perfil
CREATE TABLE public.profile_type_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_type_id uuid NOT NULL REFERENCES public.profile_types(id) ON DELETE CASCADE,
  module text NOT NULL,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_type_id, module)
);

-- Habilitar RLS
ALTER TABLE public.profile_type_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profile_type_permissions
CREATE POLICY "Authenticated users can view profile type permissions"
ON public.profile_type_permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage profile type permissions"
ON public.profile_type_permissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Adicionar coluna profile_type_id na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN profile_type_id uuid REFERENCES public.profile_types(id);

-- Popular profile_type_id com base no role atual
UPDATE public.profiles p
SET profile_type_id = pt.id
FROM public.profile_types pt
WHERE p.role::text = pt.name;

-- Criar função para aplicar permissões padrão ao criar usuário
CREATE OR REPLACE FUNCTION public.apply_default_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o usuário tem um profile_type_id, copiar permissões padrão
  IF NEW.profile_type_id IS NOT NULL THEN
    INSERT INTO public.user_permissions (user_id, module, can_view, can_create, can_edit, can_delete)
    SELECT NEW.id, ptp.module, ptp.can_view, ptp.can_create, ptp.can_edit, ptp.can_delete
    FROM public.profile_type_permissions ptp
    WHERE ptp.profile_type_id = NEW.profile_type_id
    ON CONFLICT (user_id, module) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para aplicar permissões padrão
DROP TRIGGER IF EXISTS trigger_apply_default_permissions ON public.profiles;
CREATE TRIGGER trigger_apply_default_permissions
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.apply_default_permissions();

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_profile_types_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger para updated_at
CREATE TRIGGER update_profile_types_updated_at
BEFORE UPDATE ON public.profile_types
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_types_updated_at();