-- White-label catalog settings per tenant
CREATE TABLE IF NOT EXISTS public.tenant_catalogo_settings (
  tenant_id uuid PRIMARY KEY,
  logo_url text,
  hero_title text,
  hero_subtitle text,
  footer_company_name text,
  footer_copyright text,
  whatsapp_url text,
  instagram_url text,
  primary_color text DEFAULT '#C41E3A',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_catalogo_settings ENABLE ROW LEVEL SECURITY;

-- Public read (storefront is public)
CREATE POLICY "Public can read catalog settings"
ON public.tenant_catalogo_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins/owners of the tenant can write
CREATE POLICY "Admins can insert catalog settings"
ON public.tenant_catalogo_settings
FOR INSERT
TO authenticated
WITH CHECK (public.is_owner() OR (public.is_admin() AND public.tenant_rls_check(tenant_id)));

CREATE POLICY "Admins can update catalog settings"
ON public.tenant_catalogo_settings
FOR UPDATE
TO authenticated
USING (public.is_owner() OR (public.is_admin() AND public.tenant_rls_check(tenant_id)))
WITH CHECK (public.is_owner() OR (public.is_admin() AND public.tenant_rls_check(tenant_id)));

CREATE POLICY "Admins can delete catalog settings"
ON public.tenant_catalogo_settings
FOR DELETE
TO authenticated
USING (public.is_owner() OR (public.is_admin() AND public.tenant_rls_check(tenant_id)));

CREATE TRIGGER trg_tenant_catalogo_settings_updated_at
BEFORE UPDATE ON public.tenant_catalogo_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public bucket for tenant brand assets (logos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Tenant assets public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant-assets');

CREATE POLICY "Authenticated can upload tenant assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tenant-assets');

CREATE POLICY "Authenticated can update tenant assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tenant-assets');

CREATE POLICY "Authenticated can delete tenant assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tenant-assets');