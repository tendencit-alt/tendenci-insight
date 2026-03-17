
-- =============================================
-- STEP 1: Orders → Financeiro (Receivables + Ledger)
-- =============================================
CREATE OR REPLACE FUNCTION public.create_receivable_from_order()
RETURNS TRIGGER AS $$
DECLARE
  v_ledger_id uuid;
BEGIN
  -- Only fire when status changes to 'ativo' or 'faturado'
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status 
      AND NEW.status IN ('ativo', 'faturado')
      AND (OLD.status NOT IN ('ativo', 'faturado') OR OLD.status IS NULL)) THEN
    
    -- Check if receivable already exists for this order
    IF EXISTS (SELECT 1 FROM public.fin_receivables WHERE order_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    -- Only create if valor_total > 0
    IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
      -- Create ledger entry first
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date,
        document_number, party_id, party_type, status, notes, created_by
      ) VALUES (
        'Pedido #' || NEW.order_number,
        NEW.valor_total,
        'RECEITA',
        COALESCE(NEW.data_emissao::date, NOW()::date),
        NULL,
        'PED-' || NEW.order_number::text,
        NEW.client_id,
        'client',
        'PENDENTE',
        'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
        NEW.created_by
      ) RETURNING id INTO v_ledger_id;

      -- Create receivable linked to ledger
      INSERT INTO public.fin_receivables (
        order_id, customer_id, amount, due_date, competence_date,
        status, description, document_number, notes, ledger_entry_id, created_by
      ) VALUES (
        NEW.id,
        NEW.client_id,
        NEW.valor_total,
        COALESCE(NEW.data_primeiro_vencimento::date, (NOW() + interval '30 days')::date),
        COALESCE(NEW.data_emissao::date, NOW()::date),
        'ABERTO',
        'Pedido #' || NEW.order_number,
        'PED-' || NEW.order_number::text,
        'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
        v_ledger_id,
        NEW.created_by
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_create_receivable_from_order ON public.orders;
CREATE TRIGGER trigger_create_receivable_from_order
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_receivable_from_order();

-- =============================================
-- STEP 2: Update Payables trigger to also create Ledger entry
-- =============================================
CREATE OR REPLACE FUNCTION public.create_payable_from_purchase_order()
RETURNS TRIGGER AS $$
DECLARE
  v_ledger_id uuid;
BEGIN
  IF NEW.total IS NOT NULL AND NEW.total > 0 THEN
    -- Create ledger entry first
    INSERT INTO public.fin_ledger_entries (
      description, amount, type, competence_date,
      document_number, party_id, party_type, status, notes, created_by
    ) VALUES (
      'Pedido de Compra #' || NEW.order_number,
      NEW.total,
      'DESPESA',
      COALESCE(NEW.issue_date::date, NEW.created_at::date),
      'PC-' || NEW.order_number::text,
      NEW.supplier_id,
      'supplier',
      'PENDENTE',
      'Gerado automaticamente a partir do Pedido de Compra #' || NEW.order_number,
      NEW.created_by
    ) RETURNING id INTO v_ledger_id;

    -- Create payable linked to ledger
    INSERT INTO public.fin_payables (
      supplier_id, amount, due_date, competence_date, status,
      description, document_number, notes, ledger_entry_id, created_by
    ) VALUES (
      NEW.supplier_id,
      NEW.total,
      COALESCE(NEW.expected_date::date, (NEW.created_at + interval '30 days')::date),
      COALESCE(NEW.issue_date::date, NEW.created_at::date),
      'ABERTO',
      'Pedido de Compra #' || NEW.order_number,
      'PC-' || NEW.order_number::text,
      'Gerado automaticamente a partir do Pedido de Compra #' || NEW.order_number,
      v_ledger_id,
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- STEP 3: Sync Payable payment to Ledger (cash_date)
-- =============================================
CREATE OR REPLACE FUNCTION public.sync_payable_payment_to_ledger()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'PAGO') THEN
    IF NEW.ledger_entry_id IS NOT NULL THEN
      UPDATE public.fin_ledger_entries
      SET cash_date = COALESCE(NEW.payment_date, NOW()::date),
          status = 'EFETIVADO',
          bank_account_id = NEW.bank_account_id,
          updated_at = NOW()
      WHERE id = NEW.ledger_entry_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_sync_payable_payment ON public.fin_payables;
CREATE TRIGGER trigger_sync_payable_payment
  AFTER UPDATE ON public.fin_payables
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_payable_payment_to_ledger();

-- =============================================
-- STEP 4: Sync Receivable payment to Ledger (cash_date)
-- =============================================
CREATE OR REPLACE FUNCTION public.sync_receivable_payment_to_ledger()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'RECEBIDO') THEN
    IF NEW.ledger_entry_id IS NOT NULL THEN
      UPDATE public.fin_ledger_entries
      SET cash_date = COALESCE(NEW.receipt_date, NOW()::date),
          status = 'EFETIVADO',
          bank_account_id = NEW.bank_account_id,
          updated_at = NOW()
      WHERE id = NEW.ledger_entry_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_sync_receivable_payment ON public.fin_receivables;
CREATE TRIGGER trigger_sync_receivable_payment
  AFTER UPDATE ON public.fin_receivables
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_receivable_payment_to_ledger();

-- =============================================
-- STEP 5: Add tables to realtime publication
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_order_items;
