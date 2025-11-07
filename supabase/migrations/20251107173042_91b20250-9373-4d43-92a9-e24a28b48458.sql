-- ============================================
-- SISTEMA DE AUTENTICAÇÃO E SEGURANÇA COMPLETO
-- ============================================

-- 1. CRIAR ENUM DE ROLES
CREATE TYPE public.user_role AS ENUM ('admin', 'vendedor', 'arquiteto');

-- 2. CRIAR TABELA DE PERFIS DE USUÁRIO
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'vendedor',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR FUNÇÃO PARA AUTO-CRIAR PERFIL QUANDO USUÁRIO SE REGISTRA
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'vendedor'  -- Role padrão
  );
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. FUNÇÃO PARA ATUALIZAR updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger para updated_at em profiles
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 5. FUNÇÃO SEGURA PARA VERIFICAR ROLE DO USUÁRIO
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_value user_role;
BEGIN
  SELECT role INTO user_role_value
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN user_role_value;
END;
$$;

-- 6. FUNÇÃO PARA VERIFICAR SE USUÁRIO TEM ROLE ESPECÍFICO
CREATE OR REPLACE FUNCTION public.user_has_role_check(required_role user_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = required_role
  );
END;
$$;

-- 7. FUNÇÃO PARA VERIFICAR SE É ADMIN
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- 8. POLÍTICAS RLS PARA PROFILES
-- Usuários podem ver apenas seu próprio perfil, admins veem todos
CREATE POLICY "Usuários veem próprio perfil" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id OR
    public.is_admin()
  );

-- Usuários podem atualizar apenas seu próprio perfil (exceto role)
CREATE POLICY "Usuários atualizam próprio perfil" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = role -- Não pode mudar próprio role
  );

-- Apenas admins podem atualizar roles
CREATE POLICY "Admins atualizam qualquer perfil" ON public.profiles
  FOR UPDATE
  USING (public.is_admin());

-- Criação automática via trigger (nenhuma policy necessária para INSERT)

-- 9. ATUALIZAR RLS DAS OUTRAS TABELAS PARA AUTENTICAÇÃO

-- CLIENTS - Apenas usuários autenticados
DROP POLICY IF EXISTS "Permitir leitura básica de clientes" ON public.clients;
DROP POLICY IF EXISTS "Permitir inserção de clientes" ON public.clients;
DROP POLICY IF EXISTS "Permitir atualização de clientes" ON public.clients;
DROP POLICY IF EXISTS "Permitir exclusão de clientes" ON public.clients;

CREATE POLICY "Autenticados podem ler clientes" ON public.clients
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar clientes" ON public.clients
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar clientes" ON public.clients
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem deletar clientes" ON public.clients
  FOR DELETE
  USING (public.is_admin());

-- LEADS - Apenas usuários autenticados
DROP POLICY IF EXISTS "Permitir atualização para autenticados" ON public.leads;
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.leads;
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.leads;

CREATE POLICY "Autenticados podem ler leads" ON public.leads
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar leads" ON public.leads
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar leads" ON public.leads
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem deletar leads" ON public.leads
  FOR DELETE
  USING (public.is_admin());

-- ARCHITECTS - Apenas usuários autenticados
DROP POLICY IF EXISTS "Permitir leitura básica de arquitetos" ON public.architects;
DROP POLICY IF EXISTS "Permitir inserção de arquitetos" ON public.architects;
DROP POLICY IF EXISTS "Permitir atualização de arquitetos" ON public.architects;
DROP POLICY IF EXISTS "Permitir exclusão de arquitetos" ON public.architects;

CREATE POLICY "Autenticados podem ler arquitetos" ON public.architects
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar arquitetos" ON public.architects
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar arquitetos" ON public.architects
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem deletar arquitetos" ON public.architects
  FOR DELETE
  USING (public.is_admin());

-- DEALS - Apenas usuários autenticados
DROP POLICY IF EXISTS "Permitir atualização para autenticados" ON public.deals;
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.deals;
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.deals;

CREATE POLICY "Autenticados podem ler deals" ON public.deals
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar deals" ON public.deals
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar deals" ON public.deals
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem deletar deals" ON public.deals
  FOR DELETE
  USING (public.is_admin());

-- PROJECTS - Apenas usuários autenticados
DROP POLICY IF EXISTS "Permitir atualização para autenticados" ON public.projects;
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.projects;
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.projects;

CREATE POLICY "Autenticados podem ler projetos" ON public.projects
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar projetos" ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar projetos" ON public.projects
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem deletar projetos" ON public.projects
  FOR DELETE
  USING (public.is_admin());

-- ACTIVITIES - Apenas usuários autenticados
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.activities;
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.activities;

CREATE POLICY "Autenticados podem ler atividades" ON public.activities
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar atividades" ON public.activities
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- REMINDERS - Apenas usuários autenticados
DROP POLICY IF EXISTS "Permitir atualização para autenticados" ON public.reminders;
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.reminders;
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.reminders;

CREATE POLICY "Autenticados podem ler lembretes" ON public.reminders
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar lembretes" ON public.reminders
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários atualizam próprios lembretes" ON public.reminders
  FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Usuários deletam próprios lembretes" ON public.reminders
  FOR DELETE
  USING (auth.uid() = created_by);

-- LEAD_ATTACHMENTS - Apenas usuários autenticados
DROP POLICY IF EXISTS "Permitir leitura de anexos" ON public.lead_attachments;
DROP POLICY IF EXISTS "Permitir inserção de anexos" ON public.lead_attachments;
DROP POLICY IF EXISTS "Permitir exclusão de anexos" ON public.lead_attachments;

CREATE POLICY "Autenticados podem ler anexos" ON public.lead_attachments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem criar anexos" ON public.lead_attachments
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar anexos" ON public.lead_attachments
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- STORAGE - lead-attachments bucket
DROP POLICY IF EXISTS "Permitir leitura de anexos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload de anexos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusão de anexos" ON storage.objects;

CREATE POLICY "Autenticados podem ler anexos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'lead-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem fazer upload" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'lead-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar anexos" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'lead-attachments' AND auth.uid() IS NOT NULL);

-- 10. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 11. COMENTÁRIOS DE DOCUMENTAÇÃO
COMMENT ON TABLE public.profiles IS 
'Perfis de usuários com roles (admin, vendedor, arquiteto)';

COMMENT ON FUNCTION public.get_user_role IS 
'Retorna o role do usuário de forma segura';

COMMENT ON FUNCTION public.is_admin IS 
'Verifica se o usuário atual é admin';