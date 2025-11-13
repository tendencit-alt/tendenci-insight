-- Criar tabela de permissões de usuário
CREATE TABLE IF NOT EXISTS public.tendenci_user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('master', 'vendedor')),
  acesso_leads BOOLEAN DEFAULT true,
  acesso_arquitetos BOOLEAN DEFAULT true,
  acesso_projetos BOOLEAN DEFAULT true,
  acesso_crm_kanban BOOLEAN DEFAULT true,
  acesso_metas BOOLEAN DEFAULT true,
  acesso_configuracoes BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE public.tendenci_user_permissions ENABLE ROW LEVEL SECURITY;

-- Função security definer para verificar se usuário é master
CREATE OR REPLACE FUNCTION public.is_user_master(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tendenci_user_permissions
    WHERE user_id = _user_id
    AND role = 'master'
    AND active = true
  ) OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
    AND role = 'admin'
  );
$$;

-- Função para verificar permissão específica
CREATE OR REPLACE FUNCTION public.has_module_permission(_user_id UUID, _module TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN is_user_master(_user_id) THEN true
    WHEN _module = 'leads' THEN COALESCE((SELECT acesso_leads FROM tendenci_user_permissions WHERE user_id = _user_id), true)
    WHEN _module = 'arquitetos' THEN COALESCE((SELECT acesso_arquitetos FROM tendenci_user_permissions WHERE user_id = _user_id), true)
    WHEN _module = 'projetos' THEN COALESCE((SELECT acesso_projetos FROM tendenci_user_permissions WHERE user_id = _user_id), true)
    WHEN _module = 'crm' THEN COALESCE((SELECT acesso_crm_kanban FROM tendenci_user_permissions WHERE user_id = _user_id), true)
    WHEN _module = 'metas' THEN COALESCE((SELECT acesso_metas FROM tendenci_user_permissions WHERE user_id = _user_id), true)
    WHEN _module = 'configuracoes' THEN COALESCE((SELECT acesso_configuracoes FROM tendenci_user_permissions WHERE user_id = _user_id), false)
    ELSE false
  END;
$$;

-- Políticas RLS para tendenci_user_permissions
CREATE POLICY "Masters podem ver todas as permissões"
ON public.tendenci_user_permissions
FOR SELECT
USING (is_user_master(auth.uid()));

CREATE POLICY "Masters podem atualizar permissões"
ON public.tendenci_user_permissions
FOR UPDATE
USING (is_user_master(auth.uid()));

CREATE POLICY "Masters podem criar permissões"
ON public.tendenci_user_permissions
FOR INSERT
WITH CHECK (is_user_master(auth.uid()));

CREATE POLICY "Masters podem deletar permissões"
ON public.tendenci_user_permissions
FOR DELETE
USING (is_user_master(auth.uid()));

CREATE POLICY "Usuários podem ver suas próprias permissões"
ON public.tendenci_user_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_permissions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_permissions_timestamp
BEFORE UPDATE ON public.tendenci_user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_permissions_updated_at();

-- Função para criar permissão automática ao criar perfil
CREATE OR REPLACE FUNCTION public.create_default_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tendenci_user_permissions (
    user_id,
    role,
    acesso_leads,
    acesso_arquitetos,
    acesso_projetos,
    acesso_crm_kanban,
    acesso_metas,
    acesso_configuracoes
  ) VALUES (
    NEW.id,
    CASE WHEN NEW.role = 'admin' THEN 'master' ELSE 'vendedor' END,
    true,
    true,
    true,
    true,
    true,
    CASE WHEN NEW.role = 'admin' THEN true ELSE false END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_permissions
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_default_permissions();