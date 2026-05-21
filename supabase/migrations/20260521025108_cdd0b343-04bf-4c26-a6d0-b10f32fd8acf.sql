ALTER TABLE public.fin_chart_accounts DISABLE TRIGGER USER;

UPDATE public.fin_chart_accounts SET code = 'TMP.2' WHERE code = '2.2';
UPDATE public.fin_chart_accounts SET code = 'TMP.2' || substring(code from 4), pai_codigo = 'TMP.2' WHERE code LIKE '2.2.%';

UPDATE public.fin_chart_accounts SET code = '2.2' WHERE code = '2.4';
UPDATE public.fin_chart_accounts SET code = '2.2' || substring(code from 4), pai_codigo = '2.2' WHERE code LIKE '2.4.%';

UPDATE public.fin_chart_accounts SET code = '2.4' WHERE code = 'TMP.2';
UPDATE public.fin_chart_accounts SET code = '2.4' || substring(code from 6), pai_codigo = '2.4' WHERE code LIKE 'TMP.2.%';

ALTER TABLE public.fin_chart_accounts ENABLE TRIGGER USER;