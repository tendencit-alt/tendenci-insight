
DO $$
DECLARE
  v_root_id uuid;
  v_cmv_id uuid;
BEGIN
  -- Ensure root "2" exists in global template
  SELECT id INTO v_root_id FROM public.fin_chart_accounts
  WHERE tenant_id IS NULL AND code = '2' LIMIT 1;

  IF v_root_id IS NULL THEN
    INSERT INTO public.fin_chart_accounts
      (tenant_id, parent_id, code, name, nature, in_dre, in_cashflow, active, is_core, pai_codigo)
    VALUES
      (NULL, NULL, '2', 'Despesas sobre Vendas', 'DESPESA', true, true, true, true, NULL)
    RETURNING id INTO v_root_id;
  END IF;

  -- Link existing top-level 2.x to this root (parent_id)
  UPDATE public.fin_chart_accounts
     SET parent_id = v_root_id, pai_codigo = '2'
   WHERE tenant_id IS NULL
     AND code IN ('2.2','2.3','2.4','2.5','2.6');

  -- Insert CMV if missing
  IF NOT EXISTS (SELECT 1 FROM public.fin_chart_accounts WHERE tenant_id IS NULL AND code='2.1') THEN
    INSERT INTO public.fin_chart_accounts
      (tenant_id, parent_id, code, name, nature, in_dre, in_cashflow, active, is_core, pai_codigo)
    VALUES
      (NULL, v_root_id, '2.1', 'CMV', 'DESPESA', true, true, true, true, '2')
    RETURNING id INTO v_cmv_id;

    INSERT INTO public.fin_chart_accounts
      (tenant_id, parent_id, code, name, nature, in_dre, in_cashflow, active, is_core, pai_codigo)
    VALUES
      (NULL, v_cmv_id, '2.1.1', 'Mercadoria revendida',  'DESPESA', true, true, true, true, '2.1'),
      (NULL, v_cmv_id, '2.1.2', 'Matéria-prima',         'DESPESA', true, true, true, true, '2.1'),
      (NULL, v_cmv_id, '2.1.3', 'Mão de obra direta',    'DESPESA', true, true, true, true, '2.1'),
      (NULL, v_cmv_id, '2.1.4', 'Insumos e embalagens',  'DESPESA', true, true, true, true, '2.1'),
      (NULL, v_cmv_id, '2.1.5', 'Frete sobre compras',   'DESPESA', true, true, true, true, '2.1');
  END IF;
END $$;
