
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS catalogo_publico_ativo boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tenants_slug_lower ON public.tenants (lower(slug));

ALTER TABLE public.tenant_catalogo_settings
  ADD COLUMN IF NOT EXISTS catalogo_indexavel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS meta_description text;

DROP POLICY IF EXISTS "Public can read catalog settings" ON public.tenant_catalogo_settings;

CREATE POLICY "Anon reads public catalog settings"
ON public.tenant_catalogo_settings
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = tenant_catalogo_settings.tenant_id
      AND COALESCE(t.catalogo_publico_ativo, false) = true
      AND COALESCE(t.active, true) = true
  )
);

CREATE POLICY "Authenticated reads catalog settings of own tenant"
ON public.tenant_catalogo_settings
FOR SELECT
TO authenticated
USING (is_owner() OR tenant_rls_check(tenant_id));

CREATE OR REPLACE FUNCTION public.resolve_public_catalog(p_slug text)
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  logo_url text,
  hero_title text,
  hero_subtitle text,
  footer_company_name text,
  footer_copyright text,
  whatsapp_url text,
  instagram_url text,
  primary_color text,
  banner_url text,
  meta_description text,
  catalogo_indexavel boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id, t.name, s.logo_url, s.hero_title, s.hero_subtitle,
    s.footer_company_name, s.footer_copyright, s.whatsapp_url, s.instagram_url,
    s.primary_color, s.banner_url, s.meta_description,
    COALESCE(s.catalogo_indexavel, false)
  FROM public.tenants t
  LEFT JOIN public.tenant_catalogo_settings s ON s.tenant_id = t.id
  WHERE lower(t.slug) = lower(p_slug)
    AND COALESCE(t.catalogo_publico_ativo, false) = true
    AND COALESCE(t.active, true) = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_catalog_categories(p_slug text)
RETURNS TABLE (id uuid, name text, color text, sort_position integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH tnt AS (
    SELECT t.id AS tenant_id
    FROM public.tenants t
    WHERE lower(t.slug) = lower(p_slug)
      AND COALESCE(t.catalogo_publico_ativo, false) = true
      AND COALESCE(t.active, true) = true
    LIMIT 1
  )
  SELECT DISTINCT c.id, c.name, c.color, c."position"
  FROM public.product_categories c
  JOIN tnt ON c.tenant_id = tnt.tenant_id
  WHERE COALESCE(c.active, true) = true
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.category_id = c.id
        AND p.tenant_id = tnt.tenant_id
        AND COALESCE(p.ativo_no_catalogo, false) = true
        AND COALESCE(p.active, true) = true
    )
  ORDER BY c."position" NULLS LAST, c.name;
$$;

CREATE OR REPLACE FUNCTION public.get_public_catalog_products(
  p_slug text,
  p_search text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 60,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  descricao_curta text,
  sale_price numeric,
  image_url text,
  imagens text[],
  category_id uuid,
  category_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH tnt AS (
    SELECT t.id AS tenant_id
    FROM public.tenants t
    WHERE lower(t.slug) = lower(p_slug)
      AND COALESCE(t.catalogo_publico_ativo, false) = true
      AND COALESCE(t.active, true) = true
    LIMIT 1
  )
  SELECT
    p.id, p.name, p.descricao_curta, p.sale_price, p.image_url, p.imagens,
    p.category_id, c.name
  FROM public.products p
  JOIN tnt ON p.tenant_id = tnt.tenant_id
  LEFT JOIN public.product_categories c ON c.id = p.category_id
  WHERE COALESCE(p.ativo_no_catalogo, false) = true
    AND COALESCE(p.active, true) = true
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (
      p_search IS NULL OR p_search = '' OR
      p.name ILIKE '%' || p_search || '%' OR
      COALESCE(p.descricao_curta, '') ILIKE '%' || p_search || '%' OR
      COALESCE(c.name, '') ILIKE '%' || p_search || '%'
    )
  ORDER BY c."position" NULLS LAST, c.name NULLS LAST, p.name
  LIMIT GREATEST(1, LEAST(p_limit, 200))
  OFFSET GREATEST(0, p_offset);
$$;

CREATE OR REPLACE FUNCTION public.get_public_catalog_product(p_slug text, p_product_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  descricao_curta text,
  descricao_longa text,
  sale_price numeric,
  image_url text,
  imagens text[],
  dimensoes jsonb,
  prazo_producao_dias integer,
  category_id uuid,
  category_name text,
  tenant_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH tnt AS (
    SELECT t.id AS tenant_id
    FROM public.tenants t
    WHERE lower(t.slug) = lower(p_slug)
      AND COALESCE(t.catalogo_publico_ativo, false) = true
      AND COALESCE(t.active, true) = true
    LIMIT 1
  )
  SELECT
    p.id, p.name, p.descricao_curta, p.descricao_longa, p.sale_price,
    p.image_url, p.imagens, p.dimensoes, p.prazo_producao_dias,
    p.category_id, c.name, p.tenant_id
  FROM public.products p
  JOIN tnt ON p.tenant_id = tnt.tenant_id
  LEFT JOIN public.product_categories c ON c.id = p.category_id
  WHERE p.id = p_product_id
    AND COALESCE(p.ativo_no_catalogo, false) = true
    AND COALESCE(p.active, true) = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_catalog_lead(
  p_slug text,
  p_name text,
  p_email text,
  p_phone text,
  p_message text,
  p_product_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_lead_id uuid;
  v_product_name text;
  v_note text;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) < 2 OR length(p_name) > 120 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  IF (p_email IS NULL OR p_email = '') AND (p_phone IS NULL OR p_phone = '') THEN
    RAISE EXCEPTION 'contact_required';
  END IF;
  IF p_email IS NOT NULL AND length(p_email) > 160 THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;
  IF p_phone IS NOT NULL AND length(p_phone) > 40 THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;
  IF p_message IS NOT NULL AND length(p_message) > 2000 THEN
    RAISE EXCEPTION 'message_too_long';
  END IF;

  SELECT t.id INTO v_tenant
  FROM public.tenants t
  WHERE lower(t.slug) = lower(p_slug)
    AND COALESCE(t.catalogo_publico_ativo, false) = true
    AND COALESCE(t.active, true) = true
  LIMIT 1;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'tenant_not_found';
  END IF;

  IF p_product_id IS NOT NULL THEN
    SELECT p.name INTO v_product_name
    FROM public.products p
    WHERE p.id = p_product_id
      AND p.tenant_id = v_tenant
      AND COALESCE(p.ativo_no_catalogo, false) = true
      AND COALESCE(p.active, true) = true;
    IF v_product_name IS NULL THEN
      RAISE EXCEPTION 'product_not_found';
    END IF;
  END IF;

  v_note := COALESCE(p_message, '');
  IF v_product_name IS NOT NULL THEN
    v_note := '[Catálogo público] Interesse no produto: ' || v_product_name || E'\n\n' || v_note;
  ELSE
    v_note := '[Catálogo público]' || E'\n\n' || v_note;
  END IF;

  INSERT INTO public.leads (tenant_id, name, email, phone, notes, status, temperature, source_label, created_at)
  VALUES (v_tenant, trim(p_name),
          NULLIF(trim(COALESCE(p_email,'')),''),
          NULLIF(trim(COALESCE(p_phone,'')),''),
          v_note, 'novo', 'morno', 'catalogo_publico', now())
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_public_catalog(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_catalog_categories(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_catalog_products(text, text, uuid, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_catalog_product(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_public_catalog_lead(text, text, text, text, text, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.resolve_public_catalog(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_catalog_categories(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_catalog_products(text, text, uuid, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_catalog_product(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_catalog_lead(text, text, text, text, text, uuid) TO anon, authenticated;
