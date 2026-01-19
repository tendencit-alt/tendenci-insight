-- Remover a trigger problemática que referencia coluna inexistente 'payment_method'
-- A tabela orders usa 'forma_pagamento' e 'forma_pagamento_2', não 'payment_method'

-- Primeiro, remover a trigger
DROP TRIGGER IF EXISTS trigger_recalculate_card_fees ON orders;

-- Remover a função associada
DROP FUNCTION IF EXISTS public.recalculate_order_card_fees();