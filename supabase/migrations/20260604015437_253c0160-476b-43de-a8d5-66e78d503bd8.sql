-- 1. Sincronização retroativa de pedidos para garantir financeiro 100% atualizado
-- Isso garante que as mudanças recentes no trigger (parcelamento, prazos, etc) sejam aplicadas aos dados existentes
UPDATE public.orders 
SET updated_at = now() 
WHERE status NOT IN ('cancelado') 
  AND created_at >= '2026-04-01';

-- 2. Vincular qualquer ledger entry que possa ter ficado sem ID de pedido mas tenha o document_number no padrão
UPDATE public.fin_ledger_entries fle
SET order_id = o.id
FROM public.orders o
WHERE fle.order_id IS NULL 
  AND fle.document_number = 'PED-' || o.order_number::text;

-- 3. Limpeza de lançamentos duplicados de receita que podem ter ocorrido durante as atualizações
DELETE FROM public.fin_receivables a
USING public.fin_receivables b
WHERE a.id < b.id
  AND a.order_id = b.order_id
  AND a.installment = b.installment
  AND a.amount = b.amount
  AND a.created_at > now() - interval '1 hour';

DELETE FROM public.fin_ledger_entries a
USING public.fin_ledger_entries b
WHERE a.id < b.id
  AND a.order_id = b.order_id
  AND a.installment_number = b.installment_number
  AND a.amount = b.amount
  AND a.type = 'RECEITA'
  AND a.created_at > now() - interval '1 hour';
