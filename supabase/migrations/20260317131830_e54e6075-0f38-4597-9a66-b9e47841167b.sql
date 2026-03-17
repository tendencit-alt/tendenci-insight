
-- Fix status values to match check constraint on fin_ledger_entries

-- Fix: Orders → Receivables trigger
CREATE OR REPLACE FUNCTION public.create_receivable_from_order()
RETURNS TRIGGER AS $$
DECLARE
  v_ledger_id uuid;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status 
      AND NEW.status IN ('ativo', 'faturado')
      AND (OLD.status NOT IN ('ativo', 'faturado') OR OLD.status IS NULL)) THEN
    
    IF EXISTS (SELECT 1 FROM public.fin_receivables WHERE order_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
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
        'ABERTO',
        'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
        NEW.created_by
      ) RETURNING id INTO v_ledger_id;

      INSERT INTO public.fin_receivables (
        order_id, customer_id, amount, due_date, competence_date,
        status, description, document_number, notes, ledger_entry_id, created_by
      ) VALUES (
        NEW.id, NEW.client_id, NEW.valor_total,
        COALESCE(NEW.data_primeiro_vencimento::date, (NOW() + interval '30 days')::date),
        COALESCE(NEW.data_emissao::date, NOW()::date),
        'ABERTO',
        'Pedido #' || NEW.order_number,
        'PED-' || NEW.order_number::text,
        'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
        v_ledger_id, NEW.created_by
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: Purchase Orders → Payables trigger
CREATE OR REPLACE FUNCTION public.create_payable_from_purchase_order()
RETURNS TRIGGER AS $$
DECLARE
  v_ledger_id uuid;
BEGIN
  IF NEW.total IS NOT NULL AND NEW.total > 0 THEN
    INSERT INTO public.fin_ledger_entries (
      description, amount, type, competence_date,
      document_number, party_id, party_type, status, notes, created_by
    ) VALUES (
      'Pedido de Compra #' || NEW.order_number,
      NEW.total,
      'DESPESA',
      COALESCE(NEW.issue_date::date, NEW.created_at::date),
      'PC-' || NEW.order_number::text,
      NEW.supplier_id, 'supplier', 'ABERTO',
      'Gerado automaticamente a partir do Pedido de Compra #' || NEW.order_number,
      NEW.created_by
    ) RETURNING id INTO v_ledger_id;

    INSERT INTO public.fin_payables (
      supplier_id, amount, due_date, competence_date, status,
      description, document_number, notes, ledger_entry_id, created_by
    ) VALUES (
      NEW.supplier_id, NEW.total,
      COALESCE(NEW.expected_date::date, (NEW.created_at + interval '30 days')::date),
      COALESCE(NEW.issue_date::date, NEW.created_at::date),
      'ABERTO',
      'Pedido de Compra #' || NEW.order_number,
      'PC-' || NEW.order_number::text,
      'Gerado automaticamente a partir do Pedido de Compra #' || NEW.order_number,
      v_ledger_id, NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix: Payment sync triggers to use PAGO_RECEBIDO
CREATE OR REPLACE FUNCTION public.sync_payable_payment_to_ledger()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'PAGO') THEN
    IF NEW.ledger_entry_id IS NOT NULL THEN
      UPDATE public.fin_ledger_entries
      SET cash_date = COALESCE(NEW.payment_date, NOW()::date),
          status = 'PAGO_RECEBIDO',
          bank_account_id = NEW.bank_account_id,
          updated_at = NOW()
      WHERE id = NEW.ledger_entry_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.sync_receivable_payment_to_ledger()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'RECEBIDO') THEN
    IF NEW.ledger_entry_id IS NOT NULL THEN
      UPDATE public.fin_ledger_entries
      SET cash_date = COALESCE(NEW.receipt_date, NOW()::date),
          status = 'PAGO_RECEBIDO',
          bank_account_id = NEW.bank_account_id,
          updated_at = NOW()
      WHERE id = NEW.ledger_entry_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
