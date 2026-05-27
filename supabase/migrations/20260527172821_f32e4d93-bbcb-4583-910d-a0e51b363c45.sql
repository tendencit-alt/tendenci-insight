ALTER TABLE public.hr_settings
  DROP COLUMN IF EXISTS fgts_pct,
  DROP COLUMN IF EXISTS inss_cpp_pct,
  DROP COLUMN IF EXISTS rat_pct,
  DROP COLUMN IF EXISTS terceiros_pct,
  DROP COLUMN IF EXISTS simples_optante;