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
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_total := COALESCE(NEW.valor_total, 0);

  WITH base AS (
    SELECT
      ca.id AS chart_account_id,
      ca.code,
      ca.name,
      COALESCE(sc.default_percentage, 0) AS default_pct,
      sc.resource_type::text AS configured_type,
      sc.display_name,
      lower(
        translate(
          concat_ws(' ', COALESCE(ca.name, ''), COALESCE(sc.display_name, '')),
          'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
          'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
        )
      ) AS normalized_label
    FROM public.fin_chart_accounts ca
    LEFT JOIN public.fin_strategic_resource_account_configs sc
      ON sc.chart_account_id = ca.id
     AND sc.tenant_id = NEW.tenant_id
    WHERE ca.tenant_id = NEW.tenant_id
      AND ca.code LIKE '2.2.%'
  ),
  inferred AS (
    SELECT
      base.*,
      CASE
        WHEN configured_type IS NOT NULL THEN configured_type
        WHEN normalized_label ~ '(^| )rt( |$)|repasse tecnico|recurso tecnico|responsavel tecnico|tecnico' THEN 'rt'
        WHEN normalized_label ~ 'vendedor|comissao vendedor|premiacao comercial|comercial' THEN 'vendedor'
        WHEN normalized_label ~ 'orcament' THEN 'orcamentista'
        WHEN normalized_label ~ 'projet' THEN 'projetista'
        WHEN normalized_label ~ 'montad' THEN 'montador'
        WHEN normalized_label ~ 'produ|corte|separac|afiliad|indicac' THEN 'producao'
        ELSE NULL
      END AS inferred_type
    FROM base
  ),
  prioritized AS (
    SELECT
      inferred.*,
      CASE
        WHEN inferred_type IS NULL THEN NULL
        WHEN row_number() OVER (PARTITION BY inferred_type ORDER BY code, chart_account_id) = 1 THEN inferred_type
        ELSE NULL
      END AS effective_type
    FROM inferred
  ),
  resolved AS (
    SELECT
      p.*,
      COALESCE(
        p.effective_type,
        (
          SELECT remaining.resource_type
          FROM unnest(ARRAY['rt','vendedor','orcamentista','projetista','montador','producao']) WITH ORDINALITY AS remaining(resource_type, ord)
          WHERE remaining.resource_type NOT IN (
            SELECT effective_type
            FROM prioritized
            WHERE effective_type IS NOT NULL
          )
          ORDER BY remaining.ord
          OFFSET (
            SELECT count(*)
            FROM prioritized p2
            WHERE p2.effective_type IS NULL
              AND (
                p2.code < p.code
                OR (p2.code = p.code AND p2.chart_account_id::text < p.chart_account_id::text)
              )
          )
          LIMIT 1
        )
      ) AS resolved_type
    FROM prioritized p
  )
  SELECT GREATEST(COUNT(*) FILTER (WHERE resolved_type = 'producao'), 1)
    INTO v_producao_count
  FROM resolved;

  FOR r IN
    WITH base AS (
      SELECT
        ca.id AS chart_account_id,
        ca.code,
        ca.name,
        COALESCE(sc.default_percentage, 0) AS default_pct,
        sc.resource_type::text AS configured_type,
        sc.display_name,
        lower(
          translate(
            concat_ws(' ', COALESCE(ca.name, ''), COALESCE(sc.display_name, '')),
            'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
            'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
          )
        ) AS normalized_label
      FROM public.fin_chart_accounts ca
      LEFT JOIN public.fin_strategic_resource_account_configs sc
        ON sc.chart_account_id = ca.id
       AND sc.tenant_id = NEW.tenant_id
      WHERE ca.tenant_id = NEW.tenant_id
        AND ca.code LIKE '2.2.%'
    ),
    inferred AS (
      SELECT
        base.*,
        CASE
          WHEN configured_type IS NOT NULL THEN configured_type
          WHEN normalized_label ~ '(^| )rt( |$)|repasse tecnico|recurso tecnico|responsavel tecnico|tecnico' THEN 'rt'
          WHEN normalized_label ~ 'vendedor|comissao vendedor|premiacao comercial|comercial' THEN 'vendedor'
          WHEN normalized_label ~ 'orcament' THEN 'orcamentista'
          WHEN normalized_label ~ 'projet' THEN 'projetista'
          WHEN normalized_label ~ 'montad' THEN 'montador'
          WHEN normalized_label ~ 'produ|corte|separac|afiliad|indicac' THEN 'producao'
          ELSE NULL
        END AS inferred_type
      FROM base
    ),
    prioritized AS (
      SELECT
        inferred.*,
        CASE
          WHEN inferred_type IS NULL THEN NULL
          WHEN row_number() OVER (PARTITION BY inferred_type ORDER BY code, chart_account_id) = 1 THEN inferred_type
          ELSE NULL
        END AS effective_type
      FROM inferred
    ),
    resolved AS (
      SELECT
        p.chart_account_id,
        p.code,
        p.name,
        p.default_pct,
        COALESCE(
          p.effective_type,
          (
            SELECT remaining.resource_type
            FROM unnest(ARRAY['rt','vendedor','orcamentista','projetista','montador','producao']) WITH ORDINALITY AS remaining(resource_type, ord)
            WHERE remaining.resource_type NOT IN (
              SELECT effective_type
              FROM prioritized
              WHERE effective_type IS NOT NULL
            )
            ORDER BY remaining.ord
            OFFSET (
              SELECT count(*)
              FROM prioritized p2
              WHERE p2.effective_type IS NULL
                AND (
                  p2.code < p.code
                  OR (p2.code = p.code AND p2.chart_account_id::text < p.chart_account_id::text)
                )
            )
            LIMIT 1
          )
        ) AS resolved_type
      FROM prioritized p
    )
    SELECT chart_account_id, code, name, default_pct, resolved_type
    FROM resolved
    ORDER BY code, chart_account_id
  LOOP
    v_pct := NULL;
    v_resp := NULL;
    v_selected := false;
    v_default_pct := r.default_pct;
    v_share := 1.0;

    CASE r.resolved_type
      WHEN 'rt' THEN
        v_resp := NEW.rt_responsavel_id;
        v_pct := NULLIF(NEW.rt_percentual, 0);
        v_selected := COALESCE(NEW.rt_habilitado, false) AND (v_pct IS NOT NULL OR v_resp IS NOT NULL);
      WHEN 'vendedor' THEN
        v_resp := NEW.comissao_vendedor_responsavel_id;
        v_pct := NULLIF(NEW.comissao_vendedor_percentual, 0);
        v_selected := (v_pct IS NOT NULL OR v_resp IS NOT NULL);
      WHEN 'orcamentista' THEN
        v_resp := NEW.comissao_orcamentista_responsavel_id;
        v_pct := NULLIF(NEW.comissao_orcamentista_percentual, 0);
        v_selected := (v_pct IS NOT NULL OR v_resp IS NOT NULL);
      WHEN 'projetista' THEN
        v_resp := NEW.comissao_projetista_responsavel_id;
        v_pct := NULLIF(NEW.comissao_projetista_percentual, 0);
        v_selected := (v_pct IS NOT NULL OR v_resp IS NOT NULL);
      WHEN 'montador' THEN
        v_resp := NEW.comissao_montador_responsavel_id;
        v_pct := NULLIF(NEW.comissao_montador_percentual, 0);
        v_selected := COALESCE(NEW.requer_montagem, false) AND (v_pct IS NOT NULL OR v_resp IS NOT NULL);
      WHEN 'producao' THEN
        v_resp := NEW.comissao_producao_responsavel_id;
        v_pct := NULLIF(NEW.comissao_producao_percentual, 0);
        v_selected := (v_pct IS NOT NULL OR v_resp IS NOT NULL);
        v_share := 1.0 / v_producao_count;
      ELSE
        CONTINUE;
    END CASE;

    IF v_selected THEN
      INSERT INTO public.order_strategic_commitments (
        tenant_id,
        order_id,
        chart_account_id,
        percentual,
        valor,
        habilitado,
        responsavel_id
      ) VALUES (
        NEW.tenant_id,
        NEW.id,
        r.chart_account_id,
        ROUND(COALESCE(v_pct, v_default_pct) * v_share, 4),
        ROUND(v_total * (COALESCE(v_pct, v_default_pct) / 100.0) * v_share, 2),
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
      SET habilitado = false,
          updated_at = now()
      WHERE order_id = NEW.id
        AND chart_account_id = r.chart_account_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

UPDATE public.orders
SET comissao_projetista_percentual = COALESCE(comissao_projetista_percentual, 0)
WHERE COALESCE(comissao_vendedor_percentual, 0) > 0
   OR COALESCE(comissao_orcamentista_percentual, 0) > 0
   OR COALESCE(comissao_projetista_percentual, 0) > 0
   OR COALESCE(comissao_montador_percentual, 0) > 0
   OR COALESCE(comissao_producao_percentual, 0) > 0
   OR COALESCE(rt_percentual, 0) > 0;