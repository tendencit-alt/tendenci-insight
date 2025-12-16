
-- Criar função que cria fases automaticamente quando OP é criada
CREATE OR REPLACE FUNCTION public.create_phases_for_production_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Criar todas as fases baseadas nos templates do tipo de produção
  INSERT INTO production_phases (
    production_order_id,
    phase_template_id,
    status,
    estimated_hours
  )
  SELECT 
    NEW.id,
    pt.id,
    'pendente',
    pt.sla_hours
  FROM production_phase_templates pt
  WHERE pt.production_type_id = NEW.production_type_id
    AND pt.active = true;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para criar fases automaticamente
DROP TRIGGER IF EXISTS trigger_create_phases_for_order ON production_orders;
CREATE TRIGGER trigger_create_phases_for_order
  AFTER INSERT ON production_orders
  FOR EACH ROW
  EXECUTE FUNCTION create_phases_for_production_order();

-- Criar fases para ordens existentes que não têm fases
INSERT INTO production_phases (production_order_id, phase_template_id, status, estimated_hours)
SELECT po.id, pt.id, 'pendente', pt.sla_hours
FROM production_orders po
CROSS JOIN production_phase_templates pt
WHERE pt.production_type_id = po.production_type_id
  AND pt.active = true
  AND NOT EXISTS (
    SELECT 1 FROM production_phases pp 
    WHERE pp.production_order_id = po.id 
    AND pp.phase_template_id = pt.id
  );

-- Atualizar RLS para production_phase_templates - permitir autenticados gerenciarem
DROP POLICY IF EXISTS "Admins gerenciam templates de fases" ON production_phase_templates;
DROP POLICY IF EXISTS "Autenticados leem templates de fases" ON production_phase_templates;

CREATE POLICY "Autenticados gerenciam templates de fases"
  ON production_phase_templates FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Atualizar RLS para production_types - permitir autenticados gerenciarem
DROP POLICY IF EXISTS "Admins gerenciam tipos de produção" ON production_types;
DROP POLICY IF EXISTS "Autenticados leem tipos de produção" ON production_types;

CREATE POLICY "Autenticados gerenciam tipos de produção"
  ON production_types FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
