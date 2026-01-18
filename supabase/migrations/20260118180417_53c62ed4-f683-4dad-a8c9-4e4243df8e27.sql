-- Função para criar conta a pagar automaticamente quando um pedido de compra é criado
CREATE OR REPLACE FUNCTION public.create_payable_from_purchase_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Só cria conta a pagar se o valor total for maior que 0
  IF NEW.total IS NOT NULL AND NEW.total > 0 THEN
    INSERT INTO public.fin_payables (
      supplier_id,
      amount,
      due_date,
      competence_date,
      status,
      description,
      document_number,
      notes,
      created_by
    ) VALUES (
      NEW.supplier_id,
      NEW.total,
      COALESCE(NEW.expected_date::date, (NEW.created_at + interval '30 days')::date),
      COALESCE(NEW.issue_date::date, NEW.created_at::date),
      'ABERTO',
      'Pedido de Compra #' || NEW.order_number,
      'PC-' || NEW.order_number::text,
      'Gerado automaticamente a partir do Pedido de Compra #' || NEW.order_number,
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger que dispara após inserção de pedido de compra
DROP TRIGGER IF EXISTS trigger_create_payable_from_purchase ON public.purchase_orders;

CREATE TRIGGER trigger_create_payable_from_purchase
  AFTER INSERT ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_payable_from_purchase_order();