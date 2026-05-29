DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.modules_config
    WHERE module_key = 'suprimentos'
  ) THEN
    UPDATE public.modules_config
    SET
      module_key = 'compras',
      label = 'Compras',
      category = 'operacional',
      visible_in_menu = true,
      visible_in_routes = true,
      sort_order = 20
    WHERE module_key = 'suprimentos';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.modules_config
    WHERE module_key = 'compras'
  ) THEN
    UPDATE public.modules_config
    SET
      label = 'Compras',
      category = 'operacional',
      visible_in_menu = true,
      visible_in_routes = true,
      sort_order = 20
    WHERE module_key = 'compras';
  ELSE
    INSERT INTO public.modules_config (
      module_key,
      label,
      icon,
      category,
      visible_in_menu,
      visible_in_routes,
      sort_order
    )
    VALUES (
      'compras',
      'Compras',
      'Package',
      'operacional',
      true,
      true,
      20
    );
  END IF;

  UPDATE public.modules_config
  SET category = 'operacional', visible_in_menu = true, visible_in_routes = true, sort_order = 10
  WHERE module_key = 'producao-operacoes';

  UPDATE public.modules_config
  SET category = 'operacional', visible_in_menu = true, visible_in_routes = true, sort_order = 30
  WHERE module_key = 'estoque';
END $$;