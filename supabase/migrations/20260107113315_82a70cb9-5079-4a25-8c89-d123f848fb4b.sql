-- Create material_requests table
CREATE TABLE public.material_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number SERIAL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pendente',
  requested_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view all material requests"
ON public.material_requests FOR SELECT
USING (true);

CREATE POLICY "Users can create material requests"
ON public.material_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update material requests"
ON public.material_requests FOR UPDATE
USING (true);

CREATE POLICY "Users can delete material requests"
ON public.material_requests FOR DELETE
USING (true);

-- Update trigger
CREATE TRIGGER update_material_requests_updated_at
BEFORE UPDATE ON public.material_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();