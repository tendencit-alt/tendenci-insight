
-- =========================================================================
-- 1) sync_strategic_commitment_ledger: exigir responsavel_id para gerar AP
-- =========================================================================
-- Hoje a função já remove o lançamento quando NÃO habilitado ou valor<=0.
-- Adicionamos a regra: "não selecionado" = sem responsavel_id => sem AP.
-- Implementamos isso encapsulando o "selecionado" no início.
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
  v_doc text;
  v_ledger_id uuid;
  v_cfg_cc_id uuid;
  v_due date;
  v_supplier_id uuid;
  v_selected boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.fin_payables
      WHERE document_number = 'COMP-' || OLD.id::text
        AND origem = 'order_strategic_commitment'
        AND COALESCE(status,'ABERTO') = 'ABERTO';
    DELETE FROM public.fin_ledger_entries
      WHERE document_number = 'COMP-' || OLD.id::text
        AND status IN ('ABERTO','PROVISIONADO');
    RETURN OLD;
  END IF;

  v_doc := 'COMP-' || NEW.id::text;

  -- "Selecionado" = habilitado + valor > 0 + responsavel_id atribuído
  v_selected := COALESCE(NEW.habilitado, false)
                AND COALESCE(NEW.valor, 0) > 0
                AND NEW.responsavel_id IS NOT NULL;

  IF NOT v_selected THEN
    DELETE FROM public.fin_payables
      WHERE document_number = v_doc AND origem = 'order_strategic_commitment'
        AND COALESCE(status,'ABERTO') = 'ABERTO';
    DELETE FROM public.fin_ledger_entries
      WHERE document_number = v_doc AND status IN ('ABERTO','PROVISIONADO');
    RETURN NEW;
  END IF;

  SELECT o.id, o.status, o.order_number, o.data_emissao, o.project_id, o.client_id, o.centro_custo, o.tenant_id,
         o.comissao_vendedor_responsavel_id, o.comissao_orcamentista_responsavel_id,
         o.comissao_projetista_responsavel_id, o.comissao_montador_responsavel_id,
         o.comissao_producao_responsavel_id, o.architect_id
    INTO v_order FROM public.orders o WHERE o.id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF v_order.status::text NOT IN ('ativo','aprovado','faturado','em_producao') THEN
    RETURN NEW;
  END IF;

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

  SELECT name INTO v_account_name FROM public.fin_chart_accounts WHERE id = NEW.chart_account_id;

  -- Resolve supplier
  IF NEW.responsavel_id IS NOT NULL THEN
    SELECT supplier_id INTO v_supplier_id FROM public.order_responsibles WHERE id = NEW.responsavel_id;
  END IF;
  IF v_supplier_id IS NULL THEN
    SELECT orr.supplier_id INTO v_supplier_id
      FROM public.order_responsibles orr
     WHERE orr.chart_account_id = NEW.chart_account_id
       AND orr.tenant_id = NEW.tenant_id
       AND orr.supplier_id IS NOT NULL
       AND orr.id = ANY (ARRAY[
         v_order.comissao_vendedor_responsavel_id,
         v_order.comissao_orcamentista_responsavel_id,
         v_order.comissao_projetista_responsavel_id,
         v_order.comissao_montador_responsavel_id,
         v_order.comissao_producao_responsavel_id,
         v_order.architect_id
       ]::uuid[])
     LIMIT 1;
  END IF;

  SELECT cost_center_id INTO v_cfg_cc_id
    FROM public.fin_strategic_resource_account_configs
   WHERE tenant_id = NEW.tenant_id AND chart_account_id = NEW.chart_account_id LIMIT 1;
  IF v_cfg_cc_id IS NULL THEN
    SELECT id INTO v_cfg_cc_id FROM public.fin_cost_centers
      WHERE tenant_id = NEW.tenant_id AND LOWER(name)='comercial' AND active=true LIMIT 1;
  END IF;

  IF EXISTS (SELECT 1 FROM public.fin_ledger_entries WHERE document_number = v_doc) THEN
    UPDATE public.fin_ledger_entries
    SET amount = NEW.valor,
        description = 'PED #' || v_order.order_number || ' - ' || COALESCE(v_account_name, 'Compromisso'),
        chart_account_id = NEW.chart_account_id,
        cost_center_id = v_cost_center_id,
        project_id = v_order.project_id,
        client_id = v_order.client_id,
        competence_date = COALESCE(v_order.data_emissao::date, NOW()::date),
        updated_at = now()
    WHERE document_number = v_doc AND status IN ('ABERTO','PROVISIONADO')
    RETURNING id INTO v_ledger_id;
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
      v_order.id, v_order.client_id, v_doc, 'order_strategic_commitment'
    ) RETURNING id INTO v_ledger_id;
  END IF;

  v_due := COALESCE(v_order.data_emissao::date, NOW()::date) + INTERVAL '30 days';

  IF EXISTS (SELECT 1 FROM public.fin_payables WHERE document_number = v_doc) THEN
    UPDATE public.fin_payables
    SET amount = NEW.valor,
        description = 'PED #' || v_order.order_number || ' - ' || COALESCE(v_account_name, 'Compromisso'),
        chart_account_id = NEW.chart_account_id,
        cost_center_id = v_cost_center_id,
        project_id = v_order.project_id,
        supplier_id = v_supplier_id,
        due_date = v_due,
        competence_date = COALESCE(v_order.data_emissao::date, NOW()::date),
        updated_at = now()
    WHERE document_number = v_doc AND COALESCE(status,'ABERTO') = 'ABERTO';
  ELSE
    INSERT INTO public.fin_payables (
      description, amount, due_date, competence_date, status,
      cost_center_id, project_id, chart_account_id, tenant_id,
      supplier_id, document_number, origem
    ) VALUES (
      'PED #' || v_order.order_number || ' - ' || COALESCE(v_account_name, 'Compromisso'),
      NEW.valor, v_due, COALESCE(v_order.data_emissao::date, NOW()::date), 'ABERTO',
      v_cost_center_id, v_order.project_id, NEW.chart_account_id, NEW.tenant_id,
      v_supplier_id, v_doc, 'order_strategic_commitment'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- =========================================================================
-- 2) Sincronização genérica: order -> order_strategic_commitments
-- =========================================================================
-- Substitui o trigger específico de Montador por um trigger genérico que
-- aplica a mesma regra a TODOS os compromissos conhecidos pelas colunas
-- do pedido (RT, vendedor, orçamentista, projetista, montador, produção).
DROP TRIGGER IF EXISTS trg_sync_montador_commitment_on_order ON public.orders;
DROP FUNCTION IF EXISTS public.sync_montador_commitment_on_order_update();

CREATE OR REPLACE FUNCTION public.sync_all_commitments_from_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total numeric;
  r RECORD;
  v_pct numeric;
  v_resp uuid;
  v_selected boolean;
  v_default_pct numeric;
BEGIN
  IF NEW.tenant_id IS NULL THEN RETURN NEW; END IF;
  v_total := COALESCE(NEW.valor_total, 0);

  FOR r IN
    SELECT ca.id AS chart_account_id, ca.code, ca.name,
           COALESCE(sc.default_percentage, 0) AS default_pct
      FROM public.fin_chart_accounts ca
      LEFT JOIN public.fin_strategic_resource_account_configs sc
        ON sc.chart_account_id = ca.id AND sc.tenant_id = NEW.tenant_id
     WHERE ca.tenant_id = NEW.tenant_id
       AND ca.code LIKE '2.2.%'
  LOOP
    v_pct := NULL; v_resp := NULL; v_selected := false;
    v_default_pct := r.default_pct;

    -- Map chart account → order column
    IF r.code = '2.2.6' OR LOWER(r.name) LIKE '%rt%parceiro%' OR LOWER(r.name) LIKE '%parceir%' THEN
      v_resp := NEW.rt_responsavel_id;
      v_pct  := NULLIF(NEW.rt_percentual, 0);
      v_selected := COALESCE(NEW.rt_habilitado, false)
                    AND (v_pct IS NOT NULL OR v_resp IS NOT NULL);
    ELSIF r.code = '2.2.1' OR LOWER(r.name) LIKE '%vendedor%' THEN
      v_resp := NEW.comissao_vendedor_responsavel_id;
      v_pct  := NULLIF(NEW.comissao_vendedor_percentual, 0);
      v_selected := (v_pct IS NOT NULL OR v_resp IS NOT NULL);
    ELSIF r.code = '2.2.2' OR LOWER(r.name) LIKE '%orçament%' OR LOWER(r.name) LIKE '%orcament%' THEN
      v_resp := NEW.comissao_orcamentista_responsavel_id;
      v_pct  := NULLIF(NEW.comissao_orcamentista_percentual, 0);
      v_selected := (v_pct IS NOT NULL OR v_resp IS NOT NULL);
    ELSIF LOWER(r.name) LIKE '%projetista%' THEN
      v_resp := NEW.comissao_projetista_responsavel_id;
      v_pct  := NULLIF(NEW.comissao_projetista_percentual, 0);
      v_selected := (v_pct IS NOT NULL OR v_resp IS NOT NULL);
    ELSIF r.code = '2.2.5' OR LOWER(r.name) LIKE '%montador%' THEN
      v_resp := NEW.comissao_montador_responsavel_id;
      v_pct  := NULLIF(NEW.comissao_montador_percentual, 0);
      v_selected := COALESCE(NEW.requer_montagem, false)
                    AND (v_pct IS NOT NULL OR v_resp IS NOT NULL);
    ELSIF LOWER(r.name) LIKE '%produ%' OR r.code IN ('2.2.3','2.2.4') THEN
      v_resp := NEW.comissao_producao_responsavel_id;
      v_pct  := NULLIF(NEW.comissao_producao_percentual, 0);
      v_selected := (v_pct IS NOT NULL OR v_resp IS NOT NULL);
    ELSE
      -- Categoria desconhecida → não toca em registros existentes
      CONTINUE;
    END IF;

    IF v_selected THEN
      INSERT INTO public.order_strategic_commitments (
        tenant_id, order_id, chart_account_id, percentual, valor, habilitado, responsavel_id
      ) VALUES (
        NEW.tenant_id, NEW.id, r.chart_account_id,
        COALESCE(v_pct, v_default_pct),
        v_total * (COALESCE(v_pct, v_default_pct) / 100.0),
        true,
        v_resp
      )
      ON CONFLICT (order_id, chart_account_id) DO UPDATE
         SET habilitado = true,
             percentual = EXCLUDED.percentual,
             valor = EXCLUDED.valor,
             responsavel_id = COALESCE(EXCLUDED.responsavel_id, public.order_strategic_commitments.responsavel_id),
             updated_at = now();
    ELSE
      UPDATE public.order_strategic_commitments
         SET habilitado = false, updated_at = now()
       WHERE order_id = NEW.id AND chart_account_id = r.chart_account_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_all_commitments_from_order ON public.orders;
CREATE TRIGGER trg_sync_all_commitments_from_order
AFTER INSERT OR UPDATE OF
  valor_total,
  requer_montagem,
  rt_habilitado, rt_percentual, rt_responsavel_id,
  comissao_vendedor_percentual, comissao_vendedor_responsavel_id,
  comissao_orcamentista_percentual, comissao_orcamentista_responsavel_id,
  comissao_projetista_percentual, comissao_projetista_responsavel_id,
  comissao_montador_percentual, comissao_montador_responsavel_id,
  comissao_producao_percentual, comissao_producao_responsavel_id
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_all_commitments_from_order();

-- =========================================================================
-- 3) Backfill: limpar payables abertos cujos compromissos não foram
-- realmente selecionados (sem responsavel_id ou não habilitado).
-- O trigger sync_strategic_commitment_ledger faz a remoção automática,
-- então basta tocar habilitado=false em quem não foi selecionado.
-- =========================================================================
UPDATE public.order_strategic_commitments osc
   SET habilitado = false, updated_at = now()
 WHERE habilitado = true
   AND responsavel_id IS NULL;
