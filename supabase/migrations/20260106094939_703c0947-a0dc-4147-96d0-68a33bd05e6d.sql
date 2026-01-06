-- Popular sla_dias_uteis_custom para OPs de Móveis Planejados existentes que ainda não têm
UPDATE production_phases
SET sla_dias_uteis_custom = ppt.sla_dias_uteis
FROM production_phase_templates ppt, production_orders po
WHERE production_phases.phase_template_id = ppt.id
  AND po.id = production_phases.production_order_id
  AND po.production_type_id = 'd5937611-50ab-4309-af27-86b6b302ce8a'
  AND production_phases.sla_dias_uteis_custom IS NULL
  AND ppt.sla_dias_uteis IS NOT NULL;