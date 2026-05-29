
CREATE OR REPLACE FUNCTION public.infer_order_responsible_type(_chart_account_id uuid)
RETURNS public.order_responsible_type
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_lower text;
BEGIN
  IF _chart_account_id IS NULL THEN RETURN NULL; END IF;
  SELECT name INTO v_name FROM public.fin_chart_accounts WHERE id = _chart_account_id;
  IF v_name IS NULL THEN RETURN NULL; END IF;
  -- Normalize: lower + strip common accents via translate
  v_lower := LOWER(translate(v_name,
    'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'));
  IF v_lower LIKE '%vendedor%' THEN RETURN 'vendedor';
  ELSIF v_lower LIKE '%orcamentista%' THEN RETURN 'orcamentista';
  ELSIF v_lower LIKE '%projetista%' OR v_lower LIKE '%rt %' OR v_lower LIKE '%parceiro%' OR v_lower LIKE '%arquiteto%' THEN RETURN 'projetista';
  ELSIF v_lower LIKE '%montador%' OR v_lower LIKE '%montagem%' THEN RETURN 'montador';
  ELSIF v_lower LIKE '%producao%' OR v_lower LIKE '%bonus prod%' OR v_lower LIKE '%separacao%' OR v_lower LIKE '%corte%' THEN RETURN 'producao';
  END IF;
  RETURN NULL;
END $$;

UPDATE public.order_responsibles orr
   SET type = t.inferred,
       updated_at = now()
  FROM (
    SELECT id, public.infer_order_responsible_type(chart_account_id) AS inferred
      FROM public.order_responsibles
  ) t
 WHERE orr.id = t.id
   AND orr.type IS NULL
   AND t.inferred IS NOT NULL;

CREATE OR REPLACE FUNCTION public.order_responsibles_set_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type IS NULL AND NEW.chart_account_id IS NOT NULL THEN
    NEW.type := public.infer_order_responsible_type(NEW.chart_account_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_order_responsibles_set_type ON public.order_responsibles;
CREATE TRIGGER trg_order_responsibles_set_type
BEFORE INSERT OR UPDATE OF chart_account_id, type ON public.order_responsibles
FOR EACH ROW EXECUTE FUNCTION public.order_responsibles_set_type();
