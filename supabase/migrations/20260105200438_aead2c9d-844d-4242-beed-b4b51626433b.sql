-- Add custom SLA field to production_phases for per-OP SLA management
ALTER TABLE production_phases 
ADD COLUMN IF NOT EXISTS sla_dias_uteis_custom integer DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN production_phases.sla_dias_uteis_custom IS 'SLA customizado em dias úteis para esta fase específica. Se NULL, usa o SLA do template.';

-- Create function to get effective SLA (custom or template)
CREATE OR REPLACE FUNCTION get_effective_sla_dias_uteis(
  p_phase_id uuid
) RETURNS integer AS $$
DECLARE
  v_custom_sla integer;
  v_template_sla integer;
BEGIN
  SELECT 
    pp.sla_dias_uteis_custom,
    ppt.sla_dias_uteis
  INTO v_custom_sla, v_template_sla
  FROM production_phases pp
  LEFT JOIN production_phase_templates ppt ON pp.phase_template_id = ppt.id
  WHERE pp.id = p_phase_id;
  
  RETURN COALESCE(v_custom_sla, v_template_sla, 0);
END;
$$ LANGUAGE plpgsql STABLE;