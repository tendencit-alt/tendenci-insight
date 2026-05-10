
-- 1) fin_bank_transactions: add restrictive tenant isolation
ALTER TABLE public.fin_bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_fin_bank_transactions"
  ON public.fin_bank_transactions
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (public.tenant_rls_check(tenant_id));

CREATE POLICY "tenant_isolation_modify_fin_bank_transactions"
  ON public.fin_bank_transactions
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.tenant_rls_check(tenant_id))
  WITH CHECK (public.tenant_rls_check(tenant_id));

-- 2) tendenci_whatsapp_connections: drop broad permissive policies
DROP POLICY IF EXISTS "Autenticados podem ver conexões" ON public.tendenci_whatsapp_connections;
DROP POLICY IF EXISTS "Autenticados podem atualizar conexões" ON public.tendenci_whatsapp_connections;
DROP POLICY IF EXISTS "Autenticados podem deletar conexões" ON public.tendenci_whatsapp_connections;
DROP POLICY IF EXISTS "Autenticados podem criar conexões" ON public.tendenci_whatsapp_connections;

-- 3) material_requests: add tenant_id and lock down policies
ALTER TABLE public.material_requests
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Backfill from requested_by profile
UPDATE public.material_requests mr
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE mr.requested_by = p.id AND mr.tenant_id IS NULL;

-- Default tenant_id from current user's profile on insert
CREATE OR REPLACE FUNCTION public.set_material_request_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.profiles WHERE id = auth.uid();
  END IF;
  IF NEW.requested_by IS NULL THEN
    NEW.requested_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_material_request_tenant ON public.material_requests;
CREATE TRIGGER trg_set_material_request_tenant
  BEFORE INSERT ON public.material_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_material_request_tenant();

-- Drop the public/true policies
DROP POLICY IF EXISTS "Users can view all material requests" ON public.material_requests;
DROP POLICY IF EXISTS "Users can create material requests" ON public.material_requests;
DROP POLICY IF EXISTS "Users can update material requests" ON public.material_requests;
DROP POLICY IF EXISTS "Users can delete material requests" ON public.material_requests;

-- Authenticated, tenant-scoped policies
CREATE POLICY "Authenticated can view tenant material_requests"
  ON public.material_requests
  FOR SELECT
  TO authenticated
  USING (public.tenant_rls_check(tenant_id));

CREATE POLICY "Authenticated can insert tenant material_requests"
  ON public.material_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (public.tenant_rls_check(tenant_id));

CREATE POLICY "Authenticated can update tenant material_requests"
  ON public.material_requests
  FOR UPDATE
  TO authenticated
  USING (public.tenant_rls_check(tenant_id))
  WITH CHECK (public.tenant_rls_check(tenant_id));

CREATE POLICY "Authenticated can delete tenant material_requests"
  ON public.material_requests
  FOR DELETE
  TO authenticated
  USING (public.tenant_rls_check(tenant_id));
