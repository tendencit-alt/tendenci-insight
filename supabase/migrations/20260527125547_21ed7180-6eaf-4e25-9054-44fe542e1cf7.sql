
DROP POLICY IF EXISTS supplier_contacts_tenant_restrict ON public.supplier_contacts;
CREATE POLICY supplier_contacts_tenant_restrict ON public.supplier_contacts AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_owner() OR EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_contacts.supplier_id AND public.tenant_rls_check(s.tenant_id)))
  WITH CHECK (public.is_owner() OR EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = supplier_contacts.supplier_id AND public.tenant_rls_check(s.tenant_id)));
