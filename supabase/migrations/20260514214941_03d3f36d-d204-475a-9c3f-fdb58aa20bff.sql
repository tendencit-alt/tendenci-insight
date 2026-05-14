-- 1. Cria categoria "Sem Categoria" por tenant que tenha produtos sem categoria
INSERT INTO public.product_categories (tenant_id, name, active, position)
SELECT DISTINCT p.tenant_id, 'Sem Categoria', true, 9999
FROM public.products p
WHERE p.category_id IS NULL
  AND p.tenant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.product_categories pc
    WHERE pc.tenant_id = p.tenant_id AND pc.name = 'Sem Categoria'
  );

-- 2. Backfill: associa produtos sem categoria à "Sem Categoria" do mesmo tenant
UPDATE public.products p
SET category_id = pc.id
FROM public.product_categories pc
WHERE p.category_id IS NULL
  AND p.tenant_id = pc.tenant_id
  AND pc.name = 'Sem Categoria';

-- 3. Para produtos sem tenant_id que ainda estejam sem categoria (caso de borda),
--    cria uma categoria global e associa
DO $$
DECLARE
  v_global_cat UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM public.products WHERE category_id IS NULL) THEN
    INSERT INTO public.product_categories (name, active, position)
    VALUES ('Sem Categoria', true, 9999)
    RETURNING id INTO v_global_cat;
    UPDATE public.products SET category_id = v_global_cat WHERE category_id IS NULL;
  END IF;
END $$;

-- 4. Torna a coluna NOT NULL
ALTER TABLE public.products ALTER COLUMN category_id SET NOT NULL;