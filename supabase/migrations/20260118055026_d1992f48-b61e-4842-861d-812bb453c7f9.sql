-- Create table for ledger entry splits (desdobramento)
CREATE TABLE public.fin_ledger_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_entry_id UUID NOT NULL REFERENCES public.fin_ledger_entries(id) ON DELETE CASCADE,
  chart_account_id UUID REFERENCES public.fin_chart_accounts(id),
  cost_center_id UUID REFERENCES public.fin_cost_centers(id),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  percentage NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.fin_ledger_splits ENABLE ROW LEVEL SECURITY;

-- RLS policies for fin_ledger_splits
CREATE POLICY "Users can view all splits" 
ON public.fin_ledger_splits 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create splits" 
ON public.fin_ledger_splits 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update splits" 
ON public.fin_ledger_splits 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete splits" 
ON public.fin_ledger_splits 
FOR DELETE 
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_ledger_splits_parent ON public.fin_ledger_splits(parent_entry_id);

-- Add has_splits column to ledger entries for quick check
ALTER TABLE public.fin_ledger_entries ADD COLUMN IF NOT EXISTS has_splits BOOLEAN DEFAULT false;