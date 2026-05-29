-- Make unique constraints tenant-scoped
ALTER TABLE public.credit_card_rates DROP CONSTRAINT IF EXISTS credit_card_rates_installments_key;
ALTER TABLE public.credit_card_rates
  ADD CONSTRAINT credit_card_rates_tenant_installments_key UNIQUE (tenant_id, installments);

ALTER TABLE public.payment_link_rates DROP CONSTRAINT IF EXISTS payment_link_rates_installments_key;
ALTER TABLE public.payment_link_rates
  ADD CONSTRAINT payment_link_rates_tenant_installments_key UNIQUE (tenant_id, installments);

ALTER TABLE public.boleto_rates DROP CONSTRAINT IF EXISTS boleto_rates_carencia_dias_installments_key;
ALTER TABLE public.boleto_rates
  ADD CONSTRAINT boleto_rates_tenant_carencia_installments_key UNIQUE (tenant_id, carencia_dias, installments);