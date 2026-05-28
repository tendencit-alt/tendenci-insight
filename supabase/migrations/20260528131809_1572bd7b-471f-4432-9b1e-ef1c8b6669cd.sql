
-- Remove legacy permissive policies that ignore tenant_id and cause cross-tenant leak

-- order_responsibles: drop "see all" policies; keep the tenant-scoped ones
DROP POLICY IF EXISTS "Authenticated users can view order responsibles" ON public.order_responsibles;
DROP POLICY IF EXISTS "Authenticated users can insert order responsibles" ON public.order_responsibles;
DROP POLICY IF EXISTS "Authenticated users can update order responsibles" ON public.order_responsibles;
DROP POLICY IF EXISTS "admin_only_delete" ON public.order_responsibles;

-- clients: drop legacy public-role policies (RESTRICTIVE + tenant policies remain)
DROP POLICY IF EXISTS "Autenticados podem ler clientes" ON public.clients;
DROP POLICY IF EXISTS "Autenticados podem criar clientes" ON public.clients;
DROP POLICY IF EXISTS "Autenticados podem atualizar clientes" ON public.clients;

-- suppliers: drop legacy public-role policies
DROP POLICY IF EXISTS "Autenticados leem fornecedores" ON public.suppliers;
DROP POLICY IF EXISTS "Autenticados criam fornecedores" ON public.suppliers;
DROP POLICY IF EXISTS "Autenticados atualizam fornecedores" ON public.suppliers;

-- Ensure tenant-scoped PERMISSIVE policies exist for clients (SELECT/INSERT/UPDATE)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clients' AND policyname='clients_tenant_select') THEN
    CREATE POLICY clients_tenant_select ON public.clients FOR SELECT TO authenticated USING (public.tenant_rls_check(tenant_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clients' AND policyname='clients_tenant_insert') THEN
    CREATE POLICY clients_tenant_insert ON public.clients FOR INSERT TO authenticated WITH CHECK (public.tenant_rls_check(tenant_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clients' AND policyname='clients_tenant_update') THEN
    CREATE POLICY clients_tenant_update ON public.clients FOR UPDATE TO authenticated USING (public.tenant_rls_check(tenant_id)) WITH CHECK (public.tenant_rls_check(tenant_id));
  END IF;
END $$;

-- Ensure tenant-scoped PERMISSIVE policies exist for suppliers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='suppliers' AND policyname='suppliers_tenant_select') THEN
    CREATE POLICY suppliers_tenant_select ON public.suppliers FOR SELECT TO authenticated USING (public.tenant_rls_check(tenant_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='suppliers' AND policyname='suppliers_tenant_insert') THEN
    CREATE POLICY suppliers_tenant_insert ON public.suppliers FOR INSERT TO authenticated WITH CHECK (public.tenant_rls_check(tenant_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='suppliers' AND policyname='suppliers_tenant_update') THEN
    CREATE POLICY suppliers_tenant_update ON public.suppliers FOR UPDATE TO authenticated USING (public.tenant_rls_check(tenant_id)) WITH CHECK (public.tenant_rls_check(tenant_id));
  END IF;
END $$;
