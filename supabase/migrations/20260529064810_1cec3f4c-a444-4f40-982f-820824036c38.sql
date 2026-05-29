-- Bug: o branch RT usa LIKE '%rt%' o que casa com nomes como "Corte" (co-RT-e),
-- desviando o "Bonus Produção Corte" para RT. Restringir RT estritamente pelo
-- código 2.2.6, evitando colisões textuais.
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
  v_producao_count int;
  v_share numeric;
BEGIN
  IF NEW.tenant_id IS NULL THEN RETURN NEW; END IF;
  v_total := COALESCE(NEW.valor_total, 0);

  SELECT COUNT(*) INTO v_producao_count
    FROM public.fin_chart_accounts ca
   WHERE ca.tenant_id = NEW.tenant_id
     AND ca.code LIKE '2.2.%'
     AND (ca.code IN ('2.2.3','2.2.4') OR LOWER(ca.name) LIKE '%produ%');
  IF v_producao_count < 1 THEN v_producao_count := 1; END IF;

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
    v_default_pct := r.default_pct; v_share := 1.0;

    IF r.code = '2.2.1' THEN
      v_resp := NEW.comissao_vendedor_responsavel_id;
      v_pct  := NULLIF(NEW.comissao_vendedor_percentual, 0);
      v_selected := (v_pct IS NOT NULL OR v_resp IS NOT NULL);
    ELSIF r.code = '2.2.2' THEN
      v_resp := NEW.comissao_orcamentista_responsavel_id;
      v_pct  := NULLIF(NEW.comissao_orcamentista_percentual, 0);
      v_selected := (v_pct IS NOT NULL OR v_resp IS NOT NULL);
    ELSIF r.code = '2.2.6' THEN
      v_resp := NEW.rt_responsavel_id;
      v_pct  := NULLIF(NEW.rt_percentual, 0);
      v_selected := COALESCE(NEW.rt_habilitado, false) AND (v_pct IS NOT NULL OR v_resp IS NOT NULL);
    ELSIF r.code = '2.2.5' THEN
      v_resp := NEW.comissao_montador_responsavel_id;
      v_pct  := NULLIF(NEW.comissao_montador_percentual, 0);
      v_selected := COALESCE(NEW.requer_montagem, false)
                    AND (v_pct IS NOT NULL OR v_resp IS NOT NULL);
    ELSIF r.code IN ('2.2.3','2.2.4') THEN
      v_resp := NEW.comissao_producao_responsavel_id;
      v_pct  := NULLIF(NEW.comissao_producao_percentual, 0);
      v_selected := (v_pct IS NOT NULL OR v_resp IS NOT NULL);
      v_share := 1.0 / v_producao_count;
    ELSE CONTINUE; END IF;

    IF v_selected THEN
      INSERT INTO public.order_strategic_commitments (
        tenant_id, order_id, chart_account_id, percentual, valor, habilitado, responsavel_id
      ) VALUES (
        NEW.tenant_id, NEW.id, r.chart_account_id,
        ROUND(COALESCE(v_pct, v_default_pct) * v_share, 4),
        ROUND(v_total * (COALESCE(v_pct, v_default_pct) / 100.0) * v_share, 2),
        true, v_resp
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

-- Reaplicar para todos os pedidos: toca a coluna observada para disparar o trigger
DO $$
DECLARE o RECORD; v_p numeric; BEGIN
  FOR o IN SELECT id, comissao_producao_percentual FROM public.orders LOOP
    v_p := COALESCE(o.comissao_producao_percentual, 0);
    UPDATE public.orders SET comissao_producao_percentual = v_p + 0.0001 WHERE id = o.id;
    UPDATE public.orders SET comissao_producao_percentual = v_p WHERE id = o.id;
  END LOOP;
END $$;