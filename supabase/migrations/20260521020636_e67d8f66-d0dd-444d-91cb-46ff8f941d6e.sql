DROP POLICY IF EXISTS "Authenticated users can view fin_chart_accounts" ON public.fin_chart_accounts;
DROP POLICY IF EXISTS "Authenticated users can update fin_chart_accounts" ON public.fin_chart_accounts;
DROP POLICY IF EXISTS "Authenticated users can insert fin_chart_accounts" ON public.fin_chart_accounts;
DROP POLICY IF EXISTS "Tenant users delete fin_chart_accounts" ON public.fin_chart_accounts;

DO $$
DECLARE
  t_id uuid;
BEGIN
  FOR t_id IN SELECT DISTINCT tenant_id FROM public.fin_chart_accounts WHERE tenant_id IS NOT NULL
  LOOP
    INSERT INTO public.fin_chart_accounts (
      tenant_id, code, name, parent_id, nature, in_dre, in_cashflow, active,
      dre_order, auto_generate_payable, is_core, pai_codigo, grupo_fluxo
    )
    SELECT
      t_id,
      tpl.code,
      tpl.name,
      (SELECT t.id FROM public.fin_chart_accounts t WHERE t.tenant_id = t_id AND t.code = tpl_parent.code LIMIT 1),
      tpl.nature, tpl.in_dre, tpl.in_cashflow, tpl.active,
      tpl.dre_order, tpl.auto_generate_payable, tpl.is_core, tpl.pai_codigo, tpl.grupo_fluxo
    FROM public.fin_chart_accounts tpl
    LEFT JOIN public.fin_chart_accounts tpl_parent ON tpl_parent.id = tpl.parent_id
    WHERE tpl.tenant_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.fin_chart_accounts ex
        WHERE ex.tenant_id = t_id AND ex.code = tpl.code
      )
    ORDER BY length(tpl.code), tpl.code;
  END LOOP;
END $$;