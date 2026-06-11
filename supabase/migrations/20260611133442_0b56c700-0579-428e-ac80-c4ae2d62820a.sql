
-- 1) Budget tables: replace owner-only restrictive policies with tenant-scoped ones
DROP POLICY IF EXISTS budget_product_lines_owner_only_restrict ON public.budget_product_lines;
CREATE POLICY budget_product_lines_tenant_restrict ON public.budget_product_lines
  AS RESTRICTIVE FOR ALL TO public
  USING (
    is_owner() OR EXISTS (
      SELECT 1 FROM public.budget_products bp
      JOIN public.project_budgets pb ON pb.id = bp.budget_id
      WHERE bp.id = budget_product_lines.product_id
        AND tenant_rls_check(pb.tenant_id)
    )
  )
  WITH CHECK (
    is_owner() OR EXISTS (
      SELECT 1 FROM public.budget_products bp
      JOIN public.project_budgets pb ON pb.id = bp.budget_id
      WHERE bp.id = budget_product_lines.product_id
        AND tenant_rls_check(pb.tenant_id)
    )
  );

DROP POLICY IF EXISTS budget_products_owner_only_restrict ON public.budget_products;
CREATE POLICY budget_products_tenant_restrict ON public.budget_products
  AS RESTRICTIVE FOR ALL TO public
  USING (
    is_owner() OR EXISTS (
      SELECT 1 FROM public.project_budgets pb
      WHERE pb.id = budget_products.budget_id
        AND tenant_rls_check(pb.tenant_id)
    )
  )
  WITH CHECK (
    is_owner() OR EXISTS (
      SELECT 1 FROM public.project_budgets pb
      WHERE pb.id = budget_products.budget_id
        AND tenant_rls_check(pb.tenant_id)
    )
  );

DROP POLICY IF EXISTS budget_template_lines_owner_only_restrict ON public.budget_template_lines;
CREATE POLICY budget_template_lines_tenant_restrict ON public.budget_template_lines
  AS RESTRICTIVE FOR ALL TO public
  USING (
    is_owner() OR EXISTS (
      SELECT 1 FROM public.budget_product_templates t
      WHERE t.id = budget_template_lines.template_id
        AND tenant_rls_check(t.tenant_id)
    )
  )
  WITH CHECK (
    is_owner() OR EXISTS (
      SELECT 1 FROM public.budget_product_templates t
      WHERE t.id = budget_template_lines.template_id
        AND tenant_rls_check(t.tenant_id)
    )
  );

-- 2) Storage: remove the "IS NULL" bypass on private buckets so unresolved files are denied
DROP POLICY IF EXISTS tenant_defense_in_depth_select ON storage.objects;
CREATE POLICY tenant_defense_in_depth_select ON storage.objects
  AS RESTRICTIVE FOR SELECT TO public
  USING (
    (bucket_id <> ALL (ARRAY['architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents','production-attachments','lead-attachments','master-ideas-files']))
    OR is_owner()
    OR (storage_tenant_for(bucket_id, name) IS NOT NULL AND tenant_rls_check(storage_tenant_for(bucket_id, name)))
  );

DROP POLICY IF EXISTS tenant_defense_in_depth_update ON storage.objects;
CREATE POLICY tenant_defense_in_depth_update ON storage.objects
  AS RESTRICTIVE FOR UPDATE TO public
  USING (
    (bucket_id <> ALL (ARRAY['architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents','production-attachments','lead-attachments','master-ideas-files']))
    OR is_owner()
    OR (storage_tenant_for(bucket_id, name) IS NOT NULL AND tenant_rls_check(storage_tenant_for(bucket_id, name)))
  );

DROP POLICY IF EXISTS tenant_defense_in_depth_delete ON storage.objects;
CREATE POLICY tenant_defense_in_depth_delete ON storage.objects
  AS RESTRICTIVE FOR DELETE TO public
  USING (
    (bucket_id <> ALL (ARRAY['architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents','production-attachments','lead-attachments','master-ideas-files']))
    OR is_owner()
    OR (storage_tenant_for(bucket_id, name) IS NOT NULL AND tenant_rls_check(storage_tenant_for(bucket_id, name)))
  );

DROP POLICY IF EXISTS tenant_defense_in_depth_insert ON storage.objects;
CREATE POLICY tenant_defense_in_depth_insert ON storage.objects
  AS RESTRICTIVE FOR INSERT TO public
  WITH CHECK (
    (bucket_id <> ALL (ARRAY['architect-files','architect-timeline','client-files','project-files','crm-files','crm-timeline','crm-timeline-attachments','deal-files','erp-documents','production-attachments','lead-attachments','master-ideas-files']))
    OR is_owner()
    OR (storage_tenant_for(bucket_id, name) IS NOT NULL AND tenant_rls_check(storage_tenant_for(bucket_id, name)))
  );

-- 3) Prospect scheduling: handle NULL campanha_id by validating architect tenant
DROP POLICY IF EXISTS restrict_arq_agendamentos_tenant ON public.tendenci_prospec_arq_agendamentos;
CREATE POLICY restrict_arq_agendamentos_tenant ON public.tendenci_prospec_arq_agendamentos
  AS RESTRICTIVE FOR ALL TO public
  USING (
    is_owner()
    OR (campanha_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tendenci_prospec_arq_campaigns c
      WHERE c.id = tendenci_prospec_arq_agendamentos.campanha_id
        AND tenant_rls_check(c.tenant_id)
    ))
    OR (campanha_id IS NULL AND EXISTS (
      SELECT 1 FROM public.architects a
      WHERE a.id = tendenci_prospec_arq_agendamentos.architect_id
        AND tenant_rls_check(a.tenant_id)
    ))
  )
  WITH CHECK (
    is_owner()
    OR (campanha_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tendenci_prospec_arq_campaigns c
      WHERE c.id = tendenci_prospec_arq_agendamentos.campanha_id
        AND tenant_rls_check(c.tenant_id)
    ))
    OR (campanha_id IS NULL AND EXISTS (
      SELECT 1 FROM public.architects a
      WHERE a.id = tendenci_prospec_arq_agendamentos.architect_id
        AND tenant_rls_check(a.tenant_id)
    ))
  );
