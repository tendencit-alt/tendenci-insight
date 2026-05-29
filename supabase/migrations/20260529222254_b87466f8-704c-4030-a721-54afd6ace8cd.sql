ALTER TABLE public.production_status_columns
ADD COLUMN IF NOT EXISTS sla_unit TEXT NOT NULL DEFAULT 'days'
CHECK (sla_unit IN ('days','hours'));