
CREATE TABLE public.data_quality_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  warning_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  message TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dqw_tenant_entity ON public.data_quality_warnings(tenant_id, entity_type, entity_id);
CREATE INDEX idx_dqw_status ON public.data_quality_warnings(tenant_id, status) WHERE status = 'open';

ALTER TABLE public.data_quality_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_dqw" ON public.data_quality_warnings
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE POLICY "tenant_insert_dqw" ON public.data_quality_warnings
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE POLICY "tenant_update_dqw" ON public.data_quality_warnings
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id() OR public.is_owner());

CREATE OR REPLACE VIEW public.v_data_lineage AS
SELECT
  fol.tenant_id,
  fol.origin_type,
  fol.origin_id,
  fol.financial_entry_id,
  fol.payable_id,
  fol.impact_type,
  fol.impact_layer,
  fol.status AS link_status,
  fol.created_at AS linked_at,
  cme.source_module,
  cme.target_module,
  cme.event_type,
  cme.source_entity,
  cme.source_entity_id,
  cme.target_entity,
  cme.target_entity_id,
  cme.status AS event_status,
  cme.processed_at,
  cme.created_at AS event_created_at
FROM public.fin_origin_links fol
LEFT JOIN public.cross_module_events cme
  ON cme.tenant_id = fol.tenant_id
  AND (cme.source_entity_id = fol.origin_id OR cme.target_entity_id = fol.financial_entry_id);

CREATE OR REPLACE FUNCTION public.get_record_lineage(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := public.get_user_tenant_id();
  v_result JSONB := '{}'::jsonb;
  v_origin JSONB;
  v_destinations JSONB;
  v_audit JSONB;
  v_warnings JSONB;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'origin_type', origin_type,
    'origin_id', origin_id,
    'impact_type', impact_type,
    'impact_layer', impact_layer,
    'linked_at', created_at,
    'status', status
  ))
  INTO v_origin
  FROM public.fin_origin_links
  WHERE tenant_id = v_tenant_id
    AND ((p_entity_type = 'financial_entry' AND financial_entry_id = p_entity_id)
      OR (p_entity_type = 'payable' AND payable_id = p_entity_id));

  SELECT jsonb_agg(jsonb_build_object(
    'financial_entry_id', financial_entry_id,
    'payable_id', payable_id,
    'impact_type', impact_type,
    'impact_layer', impact_layer,
    'linked_at', created_at
  ))
  INTO v_destinations
  FROM public.fin_origin_links
  WHERE tenant_id = v_tenant_id
    AND origin_type = p_entity_type
    AND origin_id = p_entity_id;

  SELECT jsonb_agg(row_to_json(sub.*))
  INTO v_audit
  FROM (
    SELECT field_name, old_value, new_value, event_type, user_id, created_at
    FROM public.audit_log
    WHERE tenant_id = v_tenant_id
      AND table_name = p_entity_type
      AND record_id = p_entity_id::text
    ORDER BY created_at DESC
    LIMIT 50
  ) sub;

  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'warning_type', warning_type,
    'severity', severity,
    'message', message,
    'status', status,
    'created_at', created_at
  ))
  INTO v_warnings
  FROM public.data_quality_warnings
  WHERE tenant_id = v_tenant_id
    AND entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND status IN ('open', 'acknowledged');

  v_result := jsonb_build_object(
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'origins', COALESCE(v_origin, '[]'::jsonb),
    'destinations', COALESCE(v_destinations, '[]'::jsonb),
    'audit_history', COALESCE(v_audit, '[]'::jsonb),
    'quality_warnings', COALESCE(v_warnings, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.flag_data_quality_warning(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_warning_type TEXT,
  p_message TEXT,
  p_severity TEXT DEFAULT 'warning',
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_tenant_id UUID := public.get_user_tenant_id();
BEGIN
  SELECT id INTO v_id
  FROM public.data_quality_warnings
  WHERE tenant_id = v_tenant_id
    AND entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND warning_type = p_warning_type
    AND status = 'open'
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.data_quality_warnings(
    tenant_id, entity_type, entity_id, warning_type, severity, message,
    related_entity_type, related_entity_id, metadata, created_by
  ) VALUES (
    v_tenant_id, p_entity_type, p_entity_id, p_warning_type, p_severity, p_message,
    p_related_entity_type, p_related_entity_id, p_metadata, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.detect_manual_over_automatic()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_origin BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' AND (NEW.origem IS NULL OR NEW.origem = 'manual') THEN
    SELECT EXISTS(
      SELECT 1 FROM public.fin_ledger_entries fe
      WHERE fe.tenant_id = NEW.tenant_id
        AND fe.id <> NEW.id
        AND fe.amount = NEW.amount
        AND fe.type = NEW.type
        AND COALESCE(fe.party_id::text,'') = COALESCE(NEW.party_id::text,'')
        AND fe.competence_date BETWEEN NEW.competence_date - INTERVAL '3 days' AND NEW.competence_date + INTERVAL '3 days'
        AND fe.origem IS NOT NULL
        AND fe.origem <> 'manual'
    ) INTO v_has_origin;

    IF v_has_origin THEN
      INSERT INTO public.data_quality_warnings(
        tenant_id, entity_type, entity_id, warning_type, severity, message, metadata, created_by
      ) VALUES (
        NEW.tenant_id, 'fin_ledger_entry', NEW.id, 'manual_over_automatic', 'warning',
        'Lançamento manual criado quando já existe entrada automática semelhante. Verifique se não é duplicidade.',
        jsonb_build_object('amount', NEW.amount, 'competence_date', NEW.competence_date),
        auth.uid()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detect_manual_over_automatic ON public.fin_ledger_entries;
CREATE TRIGGER trg_detect_manual_over_automatic
AFTER INSERT ON public.fin_ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.detect_manual_over_automatic();
