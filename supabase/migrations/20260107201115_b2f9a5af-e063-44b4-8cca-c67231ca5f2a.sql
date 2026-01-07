-- Tabela para grupos de OPs unificadas
CREATE TABLE public.production_order_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,
  client_id UUID REFERENCES clients(id),
  order_id UUID REFERENCES orders(id),
  total_value NUMERIC DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar campo na production_orders para vincular ao grupo
ALTER TABLE public.production_orders 
ADD COLUMN group_id UUID REFERENCES public.production_order_groups(id);

-- Index para busca por grupo
CREATE INDEX idx_production_orders_group_id ON public.production_orders(group_id);

-- Index para busca por cliente no grupo
CREATE INDEX idx_production_order_groups_client_id ON public.production_order_groups(client_id);

-- Enable RLS
ALTER TABLE public.production_order_groups ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para production_order_groups
CREATE POLICY "Allow all operations on production_order_groups"
ON public.production_order_groups
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_production_order_groups_updated_at
BEFORE UPDATE ON public.production_order_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();