-- 1. Vincular lançamentos de RT e Montador que ficaram órfãos
UPDATE public.fin_payables fp
SET ledger_entry_id = fle.id
FROM public.fin_ledger_entries fle
WHERE fp.order_id = fle.order_id 
  AND fp.amount = fle.amount 
  AND fle.type = 'DESPESA'
  AND fp.ledger_entry_id IS NULL;

-- 2. Corrigir receitas faltantes para os pedidos mostrados na imagem
-- O pedido #46 (id: 80593bab-28e4-4a0f-bb92-9018be5b73ce) está sem fin_receivable
-- O pedido #45 (id: 44ec2eb9-4faf-426b-8462-2c177fbae3cc) está sem fin_receivable

DO $$
DECLARE
  v_order_46_id uuid := '80593bab-28e4-4a0f-bb92-9018be5b73ce';
  v_order_45_id uuid := '44ec2eb9-4faf-426b-8462-2c177fbae3cc';
BEGIN
  -- Forçar o trigger a rodar para esses pedidos específicos
  UPDATE public.orders SET updated_at = now() WHERE id IN (v_order_46_id, v_order_45_id);
  
  -- Se mesmo assim não gerou (devido a alguma trava no trigger), vamos inserir manualmente as receitas base
  IF NOT EXISTS (SELECT 1 FROM public.fin_receivables WHERE order_id = v_order_46_id) THEN
    INSERT INTO public.fin_receivables (
      tenant_id, order_id, customer_id, amount, due_date, competence_date, description, status, notes
    )
    SELECT 
      tenant_id, id, client_id, valor_total, COALESCE(data_entrega_prevista, CURRENT_DATE + 30), CURRENT_DATE,
      'Receita Pedido #46', 'ABERTO', 'Gerado via correção de inconsistência'
    FROM public.orders WHERE id = v_order_46_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.fin_receivables WHERE order_id = v_order_45_id) THEN
    INSERT INTO public.fin_receivables (
      tenant_id, order_id, customer_id, amount, due_date, competence_date, description, status, notes
    )
    SELECT 
      tenant_id, id, client_id, valor_total, COALESCE(data_entrega_prevista, CURRENT_DATE + 30), CURRENT_DATE,
      'Receita Pedido #45', 'ABERTO', 'Gerado via correção de inconsistência'
    FROM public.orders WHERE id = v_order_45_id;
  END IF;
END $$;

-- 3. Limpar lançamentos duplicados de comissão se houver
-- (Baseado no comportamento de múltiplos disparos de trigger observados)
DELETE FROM public.fin_ledger_entries a
USING public.fin_ledger_entries b
WHERE a.id < b.id
  AND a.order_id = b.order_id
  AND a.description = b.description
  AND a.amount = b.amount
  AND a.created_at > now() - interval '1 hour';
