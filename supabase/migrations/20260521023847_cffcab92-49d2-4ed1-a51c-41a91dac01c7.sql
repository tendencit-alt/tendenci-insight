ALTER TABLE public.fin_chart_accounts DISABLE TRIGGER protect_chart_account_core;
ALTER TABLE public.fin_chart_accounts DISABLE TRIGGER trg_fin_chart_accounts_fill_pai_codigo;
UPDATE public.fin_chart_accounts SET code = '2.5', pai_codigo = '2' WHERE code = '2.6';
UPDATE public.fin_chart_accounts SET code = '2.5' || substring(code from 4), pai_codigo = '2.5' WHERE code LIKE '2.6.%';
ALTER TABLE public.fin_chart_accounts ENABLE TRIGGER trg_fin_chart_accounts_fill_pai_codigo;
ALTER TABLE public.fin_chart_accounts ENABLE TRIGGER protect_chart_account_core;