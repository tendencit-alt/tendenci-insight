
-- Ensure unique "Geral" category per tenant (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS product_categories_tenant_geral_unique
  ON public.product_categories (tenant_id)
  WHERE lower(name) = 'geral';

-- Fallback trigger: when category_id is NULL on INSERT, attach (or create) the tenant's "Geral"
CREATE OR REPLACE FUNCTION public.products_default_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_cat_id uuid;
BEGIN
  -- Inherit tenant_id if missing
  IF NEW.tenant_id IS NULL THEN
    BEGIN
      NEW.tenant_id := public.get_user_tenant_id();
    EXCEPTION WHEN OTHERS THEN
      NEW.tenant_id := NULL;
    END;
  END IF;

  IF NEW.category_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_tenant := NEW.tenant_id;

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'products_default_category: tenant_id is required to resolve default category';
  END IF;

  SELECT id INTO v_cat_id
    FROM public.product_categories
   WHERE tenant_id = v_tenant AND lower(name) = 'geral'
   LIMIT 1;

  IF v_cat_id IS NULL THEN
    INSERT INTO public.product_categories (name, description, color, position, active, tenant_id)
    VALUES ('Geral', 'Categoria padrão (fallback)', 'bg-gray-500', 999, true, v_tenant)
    RETURNING id INTO v_cat_id;
  END IF;

  NEW.category_id := v_cat_id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.products_default_category() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_products_default_category ON public.products;
CREATE TRIGGER trg_products_default_category
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.products_default_category();

-- Backfill: ensure every existing tenant has a "Geral" category for future fallbacks
INSERT INTO public.product_categories (name, description, color, position, active, tenant_id)
SELECT 'Geral', 'Categoria padrão (fallback)', 'bg-gray-500', 999, true, t.id
  FROM public.tenants t
 WHERE NOT EXISTS (
   SELECT 1 FROM public.product_categories pc
    WHERE pc.tenant_id = t.id AND lower(pc.name) = 'geral'
 );
