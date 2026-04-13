
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_ledger_entries' AND column_name = 'order_id') THEN
    ALTER TABLE public.fin_ledger_entries ADD COLUMN order_id uuid REFERENCES public.orders(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_ledger_entries' AND column_name = 'client_id') THEN
    ALTER TABLE public.fin_ledger_entries ADD COLUMN client_id uuid REFERENCES public.clients(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fin_ledger_entries' AND column_name = 'vendedor_id') THEN
    ALTER TABLE public.fin_ledger_entries ADD COLUMN vendedor_id uuid REFERENCES public.profiles(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fin_ledger_entries_order_id ON public.fin_ledger_entries(order_id);
CREATE INDEX IF NOT EXISTS idx_fin_ledger_entries_client_id ON public.fin_ledger_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_fin_ledger_entries_vendedor_id ON public.fin_ledger_entries(vendedor_id);
