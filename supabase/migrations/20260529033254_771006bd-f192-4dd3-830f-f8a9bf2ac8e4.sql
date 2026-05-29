
CREATE OR REPLACE FUNCTION public.auto_create_strategic_commitments()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cfg record;
  v_total numeric;
  v_is_montador boolean;
  v_montador_selected boolean;
BEGIN
  v_total := COALESCE(NEW.valor_total, 0);
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_montador_selected := COALESCE(NEW.requer_montagem, false)
    AND (
      COALESCE(NEW.comissao_montador_percentual, 0) > 0
      OR COALESCE(NEW.comissao_montador_valor, 0) > 0
      OR NEW.comissao_montador_responsavel_id IS NOT NULL
    );

  FOR v_cfg IN
    SELECT sc.chart_account_id, COALESCE(sc.default_percentage, 0) AS pct,
           ca.code AS acc_code, ca.name AS acc_name
      FROM public.fin_strategic_resource_account_configs sc
      LEFT JOIN public.fin_chart_accounts ca ON ca.id = sc.chart_account_id
     WHERE sc.tenant_id = NEW.tenant_id
       AND sc.active = true
       AND sc.chart_account_id IS NOT NULL
       AND COALESCE(sc.default_percentage, 0) > 0
  LOOP
    v_is_montador := (v_cfg.acc_code = '2.2.5')
      OR (LOWER(COALESCE(v_cfg.acc_name, '')) LIKE '%montador%');

    IF v_is_montador AND NOT v_montador_selected THEN
      CONTINUE;
    END IF;

    INSERT INTO public.order_strategic_commitments (
      tenant_id, order_id, chart_account_id, percentual, valor, habilitado
    ) VALUES (
      NEW.tenant_id, NEW.id, v_cfg.chart_account_id,
      v_cfg.pct, v_total * (v_cfg.pct / 100.0), true
    )
    ON CONFLICT (order_id, chart_account_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_montador_commitment_on_order_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_montador_selected boolean;
  v_chart_id uuid;
  v_pct numeric;
  v_total numeric;
BEGIN
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_total := COALESCE(NEW.valor_total, 0);
  v_montador_selected := COALESCE(NEW.requer_montagem, false)
    AND (
      COALESCE(NEW.comissao_montador_percentual, 0) > 0
      OR COALESCE(NEW.comissao_montador_valor, 0) > 0
      OR NEW.comissao_montador_responsavel_id IS NOT NULL
    );

  SELECT ca.id, COALESCE(sc.default_percentage, 0)
    INTO v_chart_id, v_pct
    FROM public.fin_chart_accounts ca
    LEFT JOIN public.fin_strategic_resource_account_configs sc
      ON sc.chart_account_id = ca.id AND sc.tenant_id = NEW.tenant_id
   WHERE ca.tenant_id = NEW.tenant_id
     AND (ca.code = '2.2.5' OR LOWER(ca.name) LIKE '%montador%')
   ORDER BY (CASE WHEN ca.code = '2.2.5' THEN 0 ELSE 1 END)
   LIMIT 1;

  IF v_chart_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_montador_selected THEN
    INSERT INTO public.order_strategic_commitments (
      tenant_id, order_id, chart_account_id, percentual, valor, habilitado, responsavel_id
    ) VALUES (
      NEW.tenant_id, NEW.id, v_chart_id,
      COALESCE(NULLIF(NEW.comissao_montador_percentual, 0), v_pct),
      v_total * (COALESCE(NULLIF(NEW.comissao_montador_percentual, 0), v_pct) / 100.0),
      true,
      NEW.comissao_montador_responsavel_id
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
     WHERE order_id = NEW.id AND chart_account_id = v_chart_id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_montador_commitment_on_order ON public.orders;
CREATE TRIGGER trg_sync_montador_commitment_on_order
AFTER INSERT OR UPDATE OF requer_montagem, comissao_montador_percentual, comissao_montador_valor, comissao_montador_responsavel_id, valor_total
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_montador_commitment_on_order_update();

-- Backfill: disable Montador commitments for orders without montador selected
UPDATE public.order_strategic_commitments osc
   SET habilitado = false, updated_at = now()
 WHERE osc.habilitado = true
   AND osc.chart_account_id IN (
     SELECT id FROM public.fin_chart_accounts
     WHERE code = '2.2.5' OR LOWER(name) LIKE '%montador%'
   )
   AND osc.order_id IN (
     SELECT o.id FROM public.orders o
     WHERE NOT (
       COALESCE(o.requer_montagem, false)
       AND (
         COALESCE(o.comissao_montador_percentual, 0) > 0
         OR COALESCE(o.comissao_montador_valor, 0) > 0
         OR o.comissao_montador_responsavel_id IS NOT NULL
       )
     )
   );
