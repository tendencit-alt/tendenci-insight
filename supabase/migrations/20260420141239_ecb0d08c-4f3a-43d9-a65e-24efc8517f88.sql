ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'tenant_owner';