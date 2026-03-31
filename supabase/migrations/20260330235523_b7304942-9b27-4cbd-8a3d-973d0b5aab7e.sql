
-- Fix create_receivable_from_order to use 'ABERTO' instead of 'PENDENTE'
CREATE OR REPLACE FUNCTION public.create_receivable_from_order()
RETURNS TRIGGER AS $$
DECLARE
  v_ledger_id uuid;
BEGIN
  IF (
    (TG_OP = 'INSERT' AND NEW.status IN ('ativo', 'faturado'))
    OR 
    (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status 
      AND NEW.status IN ('ativo', 'faturado')
      AND (OLD.status NOT IN ('ativo', 'faturado') OR OLD.status IS NULL))
  ) THEN
    IF EXISTS (SELECT 1 FROM public.fin_receivables WHERE order_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
      INSERT INTO public.fin_ledger_entries (
        description, amount, type, competence_date, cash_date,
        document_number, party_id, party_type, status, notes, created_by
      ) VALUES (
        'Pedido #' || NEW.order_number,
        NEW.valor_total, 'RECEITA',
        COALESCE(NEW.data_emissao::date, NOW()::date), NULL,
        'PED-' || NEW.order_number::text, NEW.client_id, 'client',
        'ABERTO', 'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
        NEW.created_by
      ) RETURNING id INTO v_ledger_id;

      INSERT INTO public.fin_receivables (
        order_id, customer_id, amount, due_date, competence_date,
        status, description, document_number, notes, ledger_entry_id, created_by
      ) VALUES (
        NEW.id, NEW.client_id, NEW.valor_total,
        COALESCE(NEW.data_primeiro_vencimento::date, (NOW() + interval '30 days')::date),
        COALESCE(NEW.data_emissao::date, NOW()::date), 'ABERTO',
        'Pedido #' || NEW.order_number, 'PED-' || NEW.order_number::text,
        'Gerado automaticamente a partir do Pedido #' || NEW.order_number,
        v_ledger_id, NEW.created_by
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Now fix stuck order #40
UPDATE public.orders 
SET status = 'ativo', updated_at = now()
WHERE id = '8f0fea5d-c8e0-4a1f-9a1b-0a7e05490502' 
  AND status = 'rascunho';
