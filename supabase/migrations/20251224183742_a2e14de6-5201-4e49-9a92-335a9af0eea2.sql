-- Add RT (Repasse Técnico) columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS rt_habilitado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rt_percentual NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rt_valor NUMERIC(12,2) DEFAULT 0;