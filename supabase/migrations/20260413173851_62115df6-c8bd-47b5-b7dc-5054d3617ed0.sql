
ALTER TABLE public.fin_chart_accounts 
ADD COLUMN auto_generate_payable BOOLEAN NOT NULL DEFAULT false;
