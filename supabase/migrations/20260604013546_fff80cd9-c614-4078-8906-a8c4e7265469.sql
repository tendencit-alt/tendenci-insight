-- 1. Vincular fin_payables aos fin_ledger_entries correspondentes que foram criados pelo trigger
-- O trigger cria ambos mas às vezes falha em vincular o ID se a transação for interrompida ou disparada por múltiplas fontes
UPDATE public.fin_payables fp
SET ledger_entry_id = fle.id
FROM public.fin_ledger_entries fle
WHERE fp.order_id = fle.order_id 
  AND fp.amount = fle.amount 
  AND fle.type = 'DESPESA'
  AND fp.ledger_entry_id IS NULL;

-- 2. Garantir que fin_receivables também estejam vinculados
UPDATE public.fin_receivables fr
SET ledger_entry_id = fle.id
FROM public.fin_ledger_entries fle
WHERE fr.order_id = fle.order_id 
  AND fr.amount = fle.amount 
  AND fle.type = 'RECEITA'
  AND fr.ledger_entry_id IS NULL;

-- 3. Corrigir ordens de produção (production_orders) para refletir o valor real considerando desconto do pedido
-- Primeiro, vamos atualizar a função que calcula isso para garantir que novos registros venham certos
CREATE OR REPLACE FUNCTION public.calculate_op_value_with_discount()
RETURNS TRIGGER AS $$
DECLARE
  v_total_pedido numeric;
  v_subtotal_pedido numeric;
  v_fator_desconto numeric := 1;
BEGIN
  SELECT valor_total, subtotal INTO v_total_pedido, v_subtotal_pedido
  FROM public.orders
  WHERE id = (SELECT order_id FROM public.order_items WHERE id = NEW.order_item_id);

  IF v_subtotal_pedido > 0 THEN
    v_fator_desconto := v_total_pedido / v_subtotal_pedido;
  END IF;

  -- Atualiza o valor da OP com o fator de desconto proporcional
  SELECT (COALESCE(unit_price, 0) * COALESCE(quantity, 0) * v_fator_desconto)
  INTO NEW.value
  FROM public.order_items
  WHERE id = NEW.order_item_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Disparar a atualização de financeiro para pedidos que podem estar sem receita
-- O trigger update_financial_entries_on_order_edit cuida da criação de fin_receivables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.orders WHERE status IN ('ativo','faturado','em_producao','aprovado') AND created_at >= '2026-06-01'
  LOOP
    -- Se não existir receita para o pedido, forçar update para o trigger rodar
    IF NOT EXISTS (SELECT 1 FROM public.fin_receivables WHERE order_id = r.id) THEN
      UPDATE public.orders SET updated_at = now() WHERE id = r.id;
    END IF;
  END LOOP;
END $$;
