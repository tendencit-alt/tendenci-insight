
-- =========================================================
-- 1) LEGACY: strip commission blocks, keep ONLY fees (taxa_cartao/taxa_boleto)
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_order_commission_entries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cost_center_id uuid;
  v_centro_custo_name text;
  v_chart_3_2 uuid;
BEGIN
  IF (
    (TG_OP = 'INSERT' AND NEW.status IN ('ativo', 'faturado', 'em_producao'))
    OR
    (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status
      AND NEW.status IN ('ativo', 'faturado', 'em_producao')
      AND (OLD.status NOT IN ('ativo', 'faturado', 'em_producao') OR OLD.status IS NULL))
  ) THEN
    -- Idempotency: skip if fees already posted for this order
    IF EXISTS (
      SELECT 1 FROM public.fin_ledger_entries
      WHERE order_id = NEW.id
        AND type = 'DESPESA'
        AND description LIKE 'PED #' || NEW.order_number || ' - Taxa%'
    ) THEN
      RETURN NEW;
    END IF;

    SELECT oi.centro_custo INTO v_centro_custo_name
    FROM public.order_items oi WHERE oi.order_id = NEW.id LIMIT 1;
    IF v_centro_custo_name IS NULL THEN v_centro_custo_name := NEW.centro_custo; END IF;

    IF v_centro_custo_name IS NOT NULL THEN
      SELECT id INTO v_cost_center_id FROM public.fin_cost_centers
      WHERE tenant_id = NEW.tenant_id
        AND (LOWER(name) = LOWER(v_centro_custo_name)
          OR LOWER(name) = LOWER(CASE v_centro_custo_name
              WHEN 'moveis_planejados' THEN 'Planejados'
              WHEN 'producao_tendenci' THEN 'Produção Tendenci'
              WHEN 'revenda' THEN 'Revenda'
              ELSE v_centro_custo_name END))
      LIMIT 1;
    END IF;

    SELECT id INTO v_chart_3_2 FROM public.fin_chart_accounts
      WHERE code = '3.2' AND tenant_id = NEW.tenant_id LIMIT 1;

    -- TAXA CARTÃO (kept — payment fee, not in 2.2.x compromissos scope)
    IF NEW.taxa_cartao_valor IS NOT NULL AND NEW.taxa_cartao_valor > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, status,
        cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Taxa Cartão',
        NEW.taxa_cartao_valor, 'DESPESA',
        COALESCE(NEW.data_emissao::date, NOW()::date), NULL, 'ABERTO',
        v_cost_center_id, NEW.project_id, v_chart_3_2,
        NEW.tenant_id, NEW.id, NEW.client_id
      );
    END IF;

    -- TAXA BOLETO (kept)
    IF NEW.taxa_boleto_valor IS NOT NULL AND NEW.taxa_boleto_valor > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date, status,
        cost_center_id, project_id, chart_account_id, tenant_id, order_id, client_id
      ) VALUES (
        'PED #' || NEW.order_number || ' - Taxa Boleto',
        NEW.taxa_boleto_valor, 'DESPESA',
        COALESCE(NEW.data_emissao::date, NOW()::date), NULL, 'ABERTO',
        v_cost_center_id, NEW.project_id, v_chart_3_2,
        NEW.tenant_id, NEW.id, NEW.client_id
      );
    END IF;

    -- NOTE: commission blocks (rt, vendedor, orcamentista, projetista, montador)
    -- removed. Now sourced exclusively from order_strategic_commitments (see below).
  END IF;
  RETURN NEW;
END;
$function$;

-- =========================================================
-- 2) Recalc osc.valor when orders.valor_total changes
-- =========================================================
CREATE OR REPLACE FUNCTION public.recalc_strategic_commitments_on_total_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(NEW.valor_total, 0) IS DISTINCT FROM COALESCE(OLD.valor_total, 0) THEN
    UPDATE public.order_strategic_commitments
    SET valor = COALESCE(NEW.valor_total, 0) * (COALESCE(percentual, 0) / 100.0),
        updated_at = now()
    WHERE order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_recalc_osc_on_total_change ON public.orders;
CREATE TRIGGER trg_recalc_osc_on_total_change
  AFTER UPDATE OF valor_total ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_strategic_commitments_on_total_change();

REVOKE EXECUTE ON FUNCTION public.recalc_strategic_commitments_on_total_change() FROM PUBLIC, anon;

-- =========================================================
-- 3) Mirror osc into fin_ledger_entries (single source of truth)
--    Idempotency: document_number = 'COMP-' || osc.id
-- =========================================================
CREATE OR REPLACE FUNCTION public.sync_strategic_commitment_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_cost_center_id uuid;
  v_centro_custo_name text;
  v_account_name text;
  v_account_code text;
  v_doc text;
  v_gated_statuses text[] := ARRAY['ativo','aprovado','faturado','em_producao'];
BEGIN
  -- DELETE path: remove the mirrored ledger entry
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.fin_ledger_entries
    WHERE document_number = 'COMP-' || OLD.id::text
      AND status IN ('ABERTO','PROVISIONADO');
    RETURN OLD;
  END IF;

  v_doc := 'COMP-' || NEW.id::text;

  SELECT id, status, order_number, data_emissao, project_id, client_id, centro_custo, tenant_id
    INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- If disabled or zero, remove mirror (only if still ABERTO)
  IF NOT COALESCE(NEW.habilitado, false) OR COALESCE(NEW.valor, 0) <= 0 THEN
    DELETE FROM public.fin_ledger_entries
    WHERE document_number = v_doc AND status IN ('ABERTO','PROVISIONADO');
    RETURN NEW;
  END IF;

  -- Gate by order status: don't post until order is committed-ish
  IF v_order.status::text NOT IN ('ativo','aprovado','faturado','em_producao') THEN
    RETURN NEW;
  END IF;

  -- Resolve cost center
  SELECT oi.centro_custo INTO v_centro_custo_name
    FROM public.order_items oi WHERE oi.order_id = v_order.id LIMIT 1;
  IF v_centro_custo_name IS NULL THEN v_centro_custo_name := v_order.centro_custo; END IF;
  IF v_centro_custo_name IS NOT NULL THEN
    SELECT id INTO v_cost_center_id FROM public.fin_cost_centers
    WHERE tenant_id = NEW.tenant_id
      AND (LOWER(name) = LOWER(v_centro_custo_name)
        OR LOWER(name) = LOWER(CASE v_centro_custo_name
            WHEN 'moveis_planejados' THEN 'Planejados'
            WHEN 'producao_tendenci' THEN 'Produção Tendenci'
            WHEN 'revenda' THEN 'Revenda'
            ELSE v_centro_custo_name END))
    LIMIT 1;
  END IF;

  -- Pretty description: chart account name
  SELECT name, code INTO v_account_name, v_account_code
    FROM public.fin_chart_accounts WHERE id = NEW.chart_account_id;

  -- UPSERT: update if exists (ABERTO only), else insert
  IF EXISTS (
    SELECT 1 FROM public.fin_ledger_entries
    WHERE document_number = v_doc
  ) THEN
    UPDATE public.fin_ledger_entries
    SET amount = NEW.valor,
        description = 'PED #' || v_order.order_number || ' - ' || COALESCE(v_account_name, 'Compromisso'),
        chart_account_id = NEW.chart_account_id,
        cost_center_id = v_cost_center_id,
        project_id = v_order.project_id,
        client_id = v_order.client_id,
        competence_date = COALESCE(v_order.data_emissao::date, NOW()::date),
        updated_at = now()
    WHERE document_number = v_doc
      AND status IN ('ABERTO','PROVISIONADO');
  ELSE
    INSERT INTO public.fin_ledger_entries (
      description, amount, type, competence_date, cash_date, status,
      cost_center_id, project_id, chart_account_id, tenant_id,
      order_id, client_id, document_number, origem
    ) VALUES (
      'PED #' || v_order.order_number || ' - ' || COALESCE(v_account_name, 'Compromisso'),
      NEW.valor, 'DESPESA',
      COALESCE(v_order.data_emissao::date, NOW()::date), NULL, 'ABERTO',
      v_cost_center_id, v_order.project_id, NEW.chart_account_id, NEW.tenant_id,
      v_order.order_id, v_order.client_id, v_doc, 'order_strategic_commitment'
    );
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.sync_strategic_commitment_ledger() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_sync_strategic_commitment_ledger ON public.order_strategic_commitments;
CREATE TRIGGER trg_sync_strategic_commitment_ledger
  AFTER INSERT OR UPDATE OR DELETE ON public.order_strategic_commitments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_strategic_commitment_ledger();

-- =========================================================
-- 4) Backfill when order transitions INTO a gated status:
--    iterate osc rows and force the mirror sync.
-- =========================================================
CREATE OR REPLACE FUNCTION public.backfill_strategic_commitment_ledger_on_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_gated text[] := ARRAY['ativo','aprovado','faturado','em_producao'];
BEGIN
  IF NEW.status::text = ANY(v_gated)
     AND (OLD.status IS NULL OR NOT (OLD.status::text = ANY(v_gated))) THEN
    -- Touch each osc row to trigger the per-row sync (idempotent)
    UPDATE public.order_strategic_commitments
       SET updated_at = now()
     WHERE order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.backfill_strategic_commitment_ledger_on_status() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_backfill_osc_ledger_on_status ON public.orders;
CREATE TRIGGER trg_backfill_osc_ledger_on_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.backfill_strategic_commitment_ledger_on_status();

-- =========================================================
-- 5) FK safety: ensure osc → orders cascades on delete
--    (purge_order_generated_records already cleans fin_ledger by order_id)
-- =========================================================
DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT conname INTO v_conname FROM pg_constraint
   WHERE conrelid = 'public.order_strategic_commitments'::regclass
     AND contype = 'f'
     AND pg_get_constraintdef(oid) LIKE '%REFERENCES orders%';
  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.order_strategic_commitments DROP CONSTRAINT %I', v_conname);
  END IF;
  ALTER TABLE public.order_strategic_commitments
    ADD CONSTRAINT order_strategic_commitments_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
END $$;
