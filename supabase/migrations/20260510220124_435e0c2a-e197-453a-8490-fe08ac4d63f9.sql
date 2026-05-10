-- Extend leads table for raw lead pre-qualification
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source_label text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS converted_at timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS converted_deal_id uuid;

-- Update status constraint to include qualification states
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check
  CHECK (status = ANY (ARRAY['novo','qualificando','qualificado','descartado','ganho','perdido']));
