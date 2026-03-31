
-- Backfill supplier_id on existing fin_payables for fee entries
UPDATE public.fin_payables fp
SET supplier_id = fsc.supplier_id
FROM public.fee_supplier_configs fsc
WHERE fp.supplier_id IS NULL
  AND fp.description ILIKE '%Taxa Link%'
  AND fsc.fee_type = 'link_pagamento'
  AND fsc.supplier_id IS NOT NULL;

UPDATE public.fin_payables fp
SET supplier_id = fsc.supplier_id
FROM public.fee_supplier_configs fsc
WHERE fp.supplier_id IS NULL
  AND fp.description ILIKE '%Taxa Cartão%'
  AND fsc.fee_type = 'cartao_credito'
  AND fsc.supplier_id IS NOT NULL;

UPDATE public.fin_payables fp
SET supplier_id = fsc.supplier_id
FROM public.fee_supplier_configs fsc
WHERE fp.supplier_id IS NULL
  AND fp.description ILIKE '%Taxa Boleto%'
  AND fsc.fee_type = 'boleto'
  AND fsc.supplier_id IS NOT NULL;
