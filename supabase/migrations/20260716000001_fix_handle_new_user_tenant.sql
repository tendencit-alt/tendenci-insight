-- Fix M2/H1 (confronto5): handle_new_user() ignorava o tenant_id enviado pela
-- edge function public-signup-tenant em raw_user_meta_data, criando profiles
-- órfãos (tenant_id NULL) e quebrando RLS/permissões para novos usuários.
--
-- Esta migration:
--  1. Redefine handle_new_user() para ler tenant_id e role de raw_user_meta_data
--     (com fallback seguro: NULL tenant / 'vendedor'), com ON CONFLICT (id) DO NOTHING
--     para idempotência e resistência a corridas.
--  2. Backfill idempotente: cria profiles faltantes para usuários já existentes
--     em auth.users que não possuem linha em public.profiles.
--
-- Obs.: o trigger ensure_user_tenant_membership (20260525132058) já popula
-- user_tenants automaticamente quando profiles.tenant_id é definido.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id uuid;
  v_role public.user_role;
BEGIN
  -- tenant_id enviado por public-signup-tenant via user_metadata (pode ser NULL)
  BEGIN
    v_tenant_id := NULLIF(NEW.raw_user_meta_data->>'tenant_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_tenant_id := NULL;
  END;

  -- role é enum user_role: valor inválido no metadata cai no fallback 'vendedor'
  BEGIN
    v_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'vendedor')::public.user_role;
  EXCEPTION WHEN invalid_text_representation THEN
    v_role := 'vendedor';
  END;

  INSERT INTO public.profiles (id, email, full_name, role, username, tenant_id, current_tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_role,
    generate_username_from_email(NEW.email),
    v_tenant_id,
    v_tenant_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Garante que o trigger existe e aponta para a função atualizada (idempotente)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill idempotente: cria profiles para usuários órfãos já existentes
INSERT INTO public.profiles (id, email, full_name, role, username, tenant_id, current_tenant_id)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  CASE
    WHEN u.raw_user_meta_data->>'role' IN ('admin', 'vendedor', 'arquiteto', 'projetista', 'owner', 'tenant_owner')
      THEN (u.raw_user_meta_data->>'role')::public.user_role
    ELSE 'vendedor'::public.user_role
  END,
  generate_username_from_email(u.email),
  NULLIF(u.raw_user_meta_data->>'tenant_id', '')::uuid,
  NULLIF(u.raw_user_meta_data->>'tenant_id', '')::uuid
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
