-- Trigger to prevent deletion of product_categories that still have linked products
CREATE OR REPLACE FUNCTION public.prevent_delete_category_with_products()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  linked_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO linked_count
  FROM public.products
  WHERE category_id = OLD.id;

  IF linked_count > 0 THEN
    RAISE EXCEPTION
      'Não é possível excluir a categoria "%": existem % produto(s) vinculado(s). Realoque os produtos para outra categoria antes de excluir.',
      OLD.name, linked_count
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_delete_category_with_products ON public.product_categories;

CREATE TRIGGER trg_prevent_delete_category_with_products
BEFORE DELETE ON public.product_categories
FOR EACH ROW
EXECUTE FUNCTION public.prevent_delete_category_with_products();