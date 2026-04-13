
ALTER TABLE public.company_settings 
ADD COLUMN tax_regime TEXT NOT NULL DEFAULT 'simples_nacional' 
CHECK (tax_regime IN ('simples_nacional', 'lucro_presumido', 'lucro_real'));
