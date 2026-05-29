DROP TRIGGER IF EXISTS trg_auto_create_fin_project ON public.orders;
DROP TRIGGER IF EXISTS trg_sync_fin_project_on_order_update ON public.orders;

DO $$
DECLARE
  r RECORD;
  v_legacy_id uuid;
  v_standard_id uuid;
BEGIN
  FOR r IN
    SELECT o.id AS order_id, o.tenant_id, o.order_number
    FROM public.orders o
    WHERE EXISTS (
      SELECT 1 FROM public.fin_projects p
      WHERE p.tenant_id = o.tenant_id
        AND p.order_id = o.id
        AND p.code LIKE 'PED-%'
    )
  LOOP
    SELECT id INTO v_legacy_id
    FROM public.fin_projects
    WHERE tenant_id = r.tenant_id
      AND order_id = r.order_id
      AND code LIKE 'PED-%'
    ORDER BY created_at ASC
    LIMIT 1;

    SELECT id INTO v_standard_id
    FROM public.fin_projects
    WHERE tenant_id = r.tenant_id
      AND (order_id IS NULL OR order_id = r.order_id)
      AND id <> v_legacy_id
      AND name LIKE '% #' || r.order_number::text
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_standard_id IS NOT NULL AND v_legacy_id IS NOT NULL THEN
      -- Repoint references first
      UPDATE public.orders SET project_id = v_standard_id WHERE project_id = v_legacy_id;
      UPDATE public.order_items SET project_id = v_standard_id WHERE project_id = v_legacy_id;
      UPDATE public.fin_ledger_entries SET project_id = v_standard_id WHERE project_id = v_legacy_id;
      UPDATE public.fin_receivables SET project_id = v_standard_id WHERE project_id = v_legacy_id;
      UPDATE public.fin_payables SET project_id = v_standard_id WHERE project_id = v_legacy_id;
      UPDATE public.operational_projects SET project_id = v_standard_id WHERE project_id = v_legacy_id;

      -- Delete legacy BEFORE re-attaching standard to free the unique (tenant_id, order_id) slot
      DELETE FROM public.fin_projects WHERE id = v_legacy_id;

      UPDATE public.fin_projects SET order_id = r.order_id WHERE id = v_standard_id AND order_id IS NULL;
    END IF;
  END LOOP;
END $$;