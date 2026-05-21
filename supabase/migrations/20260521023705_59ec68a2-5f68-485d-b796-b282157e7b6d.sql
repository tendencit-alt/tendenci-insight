ALTER TABLE public.fin_chart_accounts DISABLE TRIGGER protect_chart_account_core;
DELETE FROM public.fin_chart_accounts WHERE code = '2.5' OR code LIKE '2.5.%';
ALTER TABLE public.fin_chart_accounts ENABLE TRIGGER protect_chart_account_core;