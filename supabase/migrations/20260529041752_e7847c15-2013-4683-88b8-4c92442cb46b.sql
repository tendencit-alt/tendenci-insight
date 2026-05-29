-- Trigger to stamp the standard note on payables generated from orders
CREATE OR REPLACE FUNCTION public.stamp_order_generated_payable_note()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_id IS NOT NULL THEN
    IF NEW.notes IS NULL OR btrim(NEW.notes) = '' THEN
      NEW.notes := 'Gerado automaticamente via pedido';
    ELSIF NEW.notes NOT ILIKE '%Gerado automaticamente via pedido%' THEN
      NEW.notes := 'Gerado automaticamente via pedido - ' || NEW.notes;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_order_generated_payable_note ON public.fin_payables;
CREATE TRIGGER trg_stamp_order_generated_payable_note
BEFORE INSERT OR UPDATE ON public.fin_payables
FOR EACH ROW
EXECUTE FUNCTION public.stamp_order_generated_payable_note();

-- Backfill existing rows
UPDATE public.fin_payables
SET notes = CASE
  WHEN notes IS NULL OR btrim(notes) = '' THEN 'Gerado automaticamente via pedido'
  ELSE 'Gerado automaticamente via pedido - ' || notes
END
WHERE order_id IS NOT NULL
  AND (notes IS NULL OR notes NOT ILIKE '%Gerado automaticamente via pedido%');