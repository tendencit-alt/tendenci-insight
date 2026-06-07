-- Seed universal de colunas Kanban de produção + provisionamento defensivo

-- 1) Coluna informativa is_seed_default
ALTER TABLE public.production_status_columns
  ADD COLUMN IF NOT EXISTS is_seed_default boolean NOT NULL DEFAULT false;

-- 2) Função idempotente de seed por tenant
CREATE OR REPLACE FUNCTION public.seed_default_production_status_columns(_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing integer;
BEGIN
  SELECT COUNT(*) INTO v_existing
  FROM public.production_status_columns
  WHERE tenant_id = _tenant_id;

  IF v_existing > 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.production_status_columns
    (tenant_id, slug, label, color, sort_order, sla_days, duration_days, sla_unit, is_system, is_seed_default)
  VALUES
    (_tenant_id, 'aguardando',   'Aguardando',   'slate',  1, 1, 1, 'days', false, true),
    (_tenant_id, 'planejamento', 'Planejamento', 'sky',    2, 2, 2, 'days', false, true),
    (_tenant_id, 'em_producao',  'Em Produção',  'orange', 3, 5, 5, 'days', false, true),
    (_tenant_id, 'em_revisao',   'Em Revisão',   'violet', 4, 2, 2, 'days', false, true),
    (_tenant_id, 'finalizacao',  'Finalização',  'yellow', 5, 2, 2, 'days', false, true),
    (_tenant_id, 'concluido',    'Concluído',    'green',  6, 1, 1, 'days', false, true);

  RETURN 6;
END;
$$;

-- 3) Trigger para novos tenants
CREATE OR REPLACE FUNCTION public.trg_seed_default_phases_on_tenant_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_production_status_columns(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_default_phases_on_tenant_create ON public.tenants;
CREATE TRIGGER trg_seed_default_phases_on_tenant_create
AFTER INSERT ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.trg_seed_default_phases_on_tenant_create();

-- 4) Substituição em Mobiliários e Master Owner (replace) — sem OPs vinculadas
DELETE FROM public.production_status_columns
WHERE tenant_id IN (
  '423ab4ec-9741-464b-948f-9edf6297e783', -- Tendenci Mobiliarios
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'  -- Master Owner
);

SELECT public.seed_default_production_status_columns('423ab4ec-9741-464b-948f-9edf6297e783');
SELECT public.seed_default_production_status_columns('a1b2c3d4-e5f6-7890-abcd-ef1234567890');

-- 5) Backfill defensivo: qualquer outro tenant com 0 colunas
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT t.id
    FROM public.tenants t
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_status_columns psc WHERE psc.tenant_id = t.id
    )
  LOOP
    PERFORM public.seed_default_production_status_columns(r.id);
  END LOOP;
END;
$$;