
-- 0) Ajustar unicidade de production_types para (tenant_id, slug)
ALTER TABLE public.production_types DROP CONSTRAINT IF EXISTS production_types_slug_key;
DROP INDEX IF EXISTS public.production_types_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS production_types_tenant_slug_key
  ON public.production_types (tenant_id, slug);

-- 1) Bug fix: validate_order_status_transition
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_valid_transitions jsonb;
  v_allowed text[];
  v_is_admin boolean;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  v_is_admin := public.is_tenant_admin(OLD.tenant_id);

  v_valid_transitions := jsonb_build_object(
    'rascunho',              '["ativo", "em_negociacao", "aprovado", "cancelado"]',
    'ativo',                 '["em_negociacao", "aprovado", "cancelado"]',
    'em_negociacao',         '["ativo", "aprovado", "rascunho", "cancelado"]',
    'aprovado',              '["liberado_producao", "em_producao", "faturado", "cancelado"]',
    'liberado_producao',     '["em_producao", "cancelado"]',
    'em_producao',           '["producao_concluida"]',
    'producao_concluida',    '["liberado_faturamento", "faturado"]',
    'liberado_faturamento',  '["faturado"]',
    'faturado',              '["entregue"]',
    'entregue',              '["encerrado"]',
    'encerrado',             '[]',
    'cancelado',             '["rascunho"]'
  );

  SELECT array_agg(val::text) INTO v_allowed
  FROM jsonb_array_elements_text((v_valid_transitions ->> OLD.status)::jsonb) AS val;

  IF NOT v_is_admin THEN
    IF v_allowed IS NULL OR NOT (NEW.status = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'Transição de status inválida: % → %. Transições permitidas: %',
        OLD.status, NEW.status, COALESCE(array_to_string(v_allowed, ', '), 'nenhuma');
    END IF;
    IF NEW.status = 'cancelado' AND OLD.status IN ('faturado', 'entregue', 'encerrado') THEN
      RAISE EXCEPTION 'Não é possível cancelar pedido após faturamento. Realize a reversão financeira primeiro.';
    END IF;
  END IF;

  CASE NEW.status
    WHEN 'aprovado' THEN
      NEW.data_aprovacao := COALESCE(NEW.data_aprovacao, now());
      NEW.approved_by   := COALESCE(NEW.approved_by, auth.uid());
    WHEN 'faturado' THEN
      NEW.data_faturamento := COALESCE(NEW.data_faturamento, now());
    WHEN 'cancelado' THEN
      NEW.data_cancelamento := now();
    ELSE
  END CASE;

  RETURN NEW;
END;
$function$;

-- 2) Seeds idempotentes
CREATE OR REPLACE FUNCTION public.seed_default_product_category(_tenant_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF _tenant_id IS NULL THEN RETURN 0; END IF;
  IF EXISTS (SELECT 1 FROM public.product_categories WHERE tenant_id=_tenant_id) THEN RETURN 0; END IF;
  INSERT INTO public.product_categories(tenant_id, name, description, color, position, active)
  VALUES (_tenant_id, 'Geral', 'Categoria padrão', 'bg-gray-500', 0, true);
  RETURN 1;
END $$;

CREATE OR REPLACE FUNCTION public.seed_default_stock_location(_tenant_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF _tenant_id IS NULL THEN RETURN 0; END IF;
  IF EXISTS (SELECT 1 FROM public.stock_locations WHERE tenant_id=_tenant_id) THEN RETURN 0; END IF;
  INSERT INTO public.stock_locations(tenant_id, name, is_default, active)
  VALUES (_tenant_id, 'Estoque Principal', true, true);
  RETURN 1;
END $$;

CREATE OR REPLACE FUNCTION public.seed_default_bank_account(_tenant_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF _tenant_id IS NULL THEN RETURN 0; END IF;
  IF EXISTS (SELECT 1 FROM public.fin_bank_accounts WHERE tenant_id=_tenant_id AND LOWER(nickname)='caixa geral') THEN RETURN 0; END IF;
  INSERT INTO public.fin_bank_accounts(tenant_id, nickname, bank_name, opening_balance, active)
  VALUES (_tenant_id, 'Caixa Geral', 'Caixa Geral', 0, true);
  RETURN 1;
END $$;

-- Seed Owner com production_types padrão (template)
INSERT INTO public.production_types(tenant_id, name, slug, color, icon, position, active)
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, v.name, v.slug, 'bg-blue-500', 'hammer', v.pos, true
FROM (VALUES
  ('Produção Interna','producao-interna',1),
  ('Produção Externa','producao-externa',2),
  ('Montagem','montagem',3),
  ('Planejados','planejados',4),
  ('Assistência Técnica','assistencia-tecnica',5)
) AS v(name, slug, pos)
WHERE NOT EXISTS (
  SELECT 1 FROM public.production_types
  WHERE tenant_id='a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid AND slug=v.slug
);

CREATE OR REPLACE FUNCTION public.clone_production_types_from_owner(_tenant_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_owner uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;
  v_count integer := 0;
BEGIN
  IF _tenant_id IS NULL OR _tenant_id = v_owner THEN RETURN 0; END IF;
  INSERT INTO public.production_types(tenant_id, name, slug, description, color, icon, position, active)
  SELECT _tenant_id, p.name, p.slug, p.description, p.color, p.icon, p.position, p.active
  FROM public.production_types p
  WHERE p.tenant_id = v_owner
    AND NOT EXISTS (
      SELECT 1 FROM public.production_types x
      WHERE x.tenant_id=_tenant_id AND x.slug=p.slug
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

-- 3) Estender trg_seed_tenant_defaults
CREATE OR REPLACE FUNCTION public.trg_seed_tenant_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.seed_default_cost_centers(NEW.id);
  PERFORM public.seed_chart_of_accounts_from_owner(NEW.id);
  PERFORM public.mirror_owner_strategic_configs_to_tenant(NEW.id);
  PERFORM public.seed_default_product_category(NEW.id);
  PERFORM public.seed_default_stock_location(NEW.id);
  PERFORM public.clone_production_types_from_owner(NEW.id);
  PERFORM public.seed_default_bank_account(NEW.id);
  RETURN NEW;
END $$;

-- 4) Backfill
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.tenants WHERE id <> 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid LOOP
    PERFORM public.seed_default_product_category(r.id);
    PERFORM public.seed_default_stock_location(r.id);
    PERFORM public.clone_production_types_from_owner(r.id);
    PERFORM public.seed_default_bank_account(r.id);
  END LOOP;
END $$;
