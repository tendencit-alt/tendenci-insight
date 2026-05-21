
-- Step 1: shift existing 2.x codes upward (from highest to lowest to avoid collisions)
-- For each tenant scope (NULL template + each tenant), 2.5 -> 2.6, 2.4 -> 2.5, ..., 2.1 -> 2.2

-- Update codes and pai_codigo for children first (2.X.Y) and then the level-1 nodes
DO $$
DECLARE
  shift_pairs text[][] := ARRAY[
    ARRAY['2.5','2.6'],
    ARRAY['2.4','2.5'],
    ARRAY['2.3','2.4'],
    ARRAY['2.2','2.3'],
    ARRAY['2.1','2.2']
  ];
  pair text[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY shift_pairs LOOP
    -- shift children codes (2.X.Y -> 2.Z.Y) and their pai_codigo
    UPDATE public.fin_chart_accounts
       SET code = pair[2] || substring(code from length(pair[1]) + 1),
           pai_codigo = pair[2]
     WHERE code LIKE pair[1] || '.%';

    -- shift the parent code itself
    UPDATE public.fin_chart_accounts
       SET code = pair[2]
     WHERE code = pair[1];
  END LOOP;
END $$;

-- Step 2: insert 2.1 CMV (and children) for the GLOBAL template (tenant_id IS NULL)
DO $$
DECLARE
  v_root_id uuid;
  v_cmv_id uuid;
BEGIN
  SELECT id INTO v_root_id
  FROM public.fin_chart_accounts
  WHERE tenant_id IS NULL AND code = '2'
  LIMIT 1;

  IF v_root_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.fin_chart_accounts
    WHERE tenant_id IS NULL AND code = '2.1'
  ) THEN
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

-- Step 3: insert 2.1 CMV (and children) for EACH existing tenant
DO $$
DECLARE
  t_id uuid;
  v_root_id uuid;
  v_cmv_id uuid;
BEGIN
  FOR t_id IN
    SELECT DISTINCT tenant_id FROM public.fin_chart_accounts WHERE tenant_id IS NOT NULL
  LOOP
    SELECT id INTO v_root_id
    FROM public.fin_chart_accounts
    WHERE tenant_id = t_id AND code = '2'
    LIMIT 1;

    IF v_root_id IS NULL THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.fin_chart_accounts WHERE tenant_id = t_id AND code = '2.1'
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.fin_chart_accounts
      (tenant_id, parent_id, code, name, nature, in_dre, in_cashflow, active, is_core, pai_codigo)
    VALUES
      (t_id, v_root_id, '2.1', 'CMV', 'DESPESA', true, true, true, true, '2')
    RETURNING id INTO v_cmv_id;

    INSERT INTO public.fin_chart_accounts
      (tenant_id, parent_id, code, name, nature, in_dre, in_cashflow, active, is_core, pai_codigo)
    VALUES
      (t_id, v_cmv_id, '2.1.1', 'Mercadoria revendida',  'DESPESA', true, true, true, true, '2.1'),
      (t_id, v_cmv_id, '2.1.2', 'Matéria-prima',         'DESPESA', true, true, true, true, '2.1'),
      (t_id, v_cmv_id, '2.1.3', 'Mão de obra direta',    'DESPESA', true, true, true, true, '2.1'),
      (t_id, v_cmv_id, '2.1.4', 'Insumos e embalagens',  'DESPESA', true, true, true, true, '2.1'),
      (t_id, v_cmv_id, '2.1.5', 'Frete sobre compras',   'DESPESA', true, true, true, true, '2.1');
  END LOOP;
END $$;
