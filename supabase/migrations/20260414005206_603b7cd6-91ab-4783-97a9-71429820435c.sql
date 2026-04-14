-- 1. Backfill NULL competence_date with due_date
UPDATE public.fin_payables 
SET competence_date = due_date 
WHERE competence_date IS NULL;

UPDATE public.fin_receivables 
SET competence_date = due_date 
WHERE competence_date IS NULL;

-- 2. Make competence_date NOT NULL with default
ALTER TABLE public.fin_payables 
ALTER COLUMN competence_date SET NOT NULL,
ALTER COLUMN competence_date SET DEFAULT now()::date;

ALTER TABLE public.fin_receivables 
ALTER COLUMN competence_date SET NOT NULL,
ALTER COLUMN competence_date SET DEFAULT now()::date;

-- 3. Auto-fill competence_date from due_date on insert
CREATE OR REPLACE FUNCTION public.auto_fill_competence_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- If competence_date is null or equals the default, inherit from due_date
  IF NEW.competence_date IS NULL OR NEW.competence_date = now()::date THEN
    NEW.competence_date := COALESCE(NEW.due_date, now()::date);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payables_auto_competence
  BEFORE INSERT ON public.fin_payables
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_fill_competence_date();

CREATE TRIGGER trg_receivables_auto_competence
  BEFORE INSERT ON public.fin_receivables
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_fill_competence_date();

-- 4. Function to mark overdue entries automatically
CREATE OR REPLACE FUNCTION public.mark_overdue_entries()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payables_count integer := 0;
  v_receivables_count integer := 0;
BEGIN
  -- Mark overdue payables
  WITH updated AS (
    UPDATE public.fin_payables
    SET status = 'VENCIDO'
    WHERE due_date < CURRENT_DATE
      AND status IN ('ABERTO', 'CONFIRMADO', 'PROVISIONADO')
      AND payment_date IS NULL
    RETURNING id
  )
  SELECT count(*) INTO v_payables_count FROM updated;

  -- Mark overdue receivables
  WITH updated AS (
    UPDATE public.fin_receivables
    SET status = 'VENCIDO'
    WHERE due_date < CURRENT_DATE
      AND status IN ('ABERTO', 'CONFIRMADO', 'PROVISIONADO')
      AND receipt_date IS NULL
    RETURNING id
  )
  SELECT count(*) INTO v_receivables_count FROM updated;

  RETURN jsonb_build_object(
    'payables_marked', v_payables_count,
    'receivables_marked', v_receivables_count,
    'executed_at', now()
  );
END;
$$;

-- 5. Auto-fill cash_date/payment_date/receipt_date on status change to paid/received
CREATE OR REPLACE FUNCTION public.auto_fill_liquidation_date_payable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- When status changes to PAGO and payment_date is null, fill it
  IF NEW.status IN ('PAGO', 'PAGO_RECEBIDO') AND OLD.status != NEW.status AND NEW.payment_date IS NULL THEN
    NEW.payment_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_fill_liquidation_date_receivable()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- When status changes to RECEBIDO and receipt_date is null, fill it
  IF NEW.status IN ('RECEBIDO', 'PAGO_RECEBIDO') AND OLD.status != NEW.status AND NEW.receipt_date IS NULL THEN
    NEW.receipt_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payables_auto_liquidation ON public.fin_payables;
CREATE TRIGGER trg_payables_auto_liquidation
  BEFORE UPDATE ON public.fin_payables
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_fill_liquidation_date_payable();

DROP TRIGGER IF EXISTS trg_receivables_auto_liquidation ON public.fin_receivables;
CREATE TRIGGER trg_receivables_auto_liquidation
  BEFORE UPDATE ON public.fin_receivables
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_fill_liquidation_date_receivable();