
-- Create company_settings table
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'Minha Empresa',
  trade_name TEXT DEFAULT '',
  cnpj TEXT DEFAULT '',
  razao_social TEXT DEFAULT '',
  inscricao_estadual TEXT DEFAULT '',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#D41E1E',
  accent_color TEXT DEFAULT '#E85D3A',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  website TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Authenticated users can view company settings"
ON public.company_settings FOR SELECT TO authenticated USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert company settings"
ON public.company_settings FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update company settings"
ON public.company_settings FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can delete company settings"
ON public.company_settings FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default row
INSERT INTO public.company_settings (company_name, trade_name) VALUES ('Minha Empresa', 'Sistema');

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);

CREATE POLICY "Anyone can view company assets"
ON storage.objects FOR SELECT USING (bucket_id = 'company-assets');

CREATE POLICY "Admins can upload company assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update company assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-assets'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can delete company assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-assets'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
