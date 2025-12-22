-- Atualizar função RPC para incluir filtro por telefone
CREATE OR REPLACE FUNCTION get_prospeccao_architects_optimized(
  p_show_nao_contactados BOOLEAN DEFAULT FALSE,
  p_vendedor_id UUID DEFAULT NULL,
  p_status_funil TEXT DEFAULT NULL,
  p_cidade TEXT DEFAULT NULL,
  p_tier TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_phone_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  company TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  tier TEXT,
  status_funil TEXT,
  tag_prospeccao TEXT,
  data_primeiro_contato TIMESTAMPTZ,
  data_ultimo_contato TIMESTAMPTZ,
  ultimo_projeto_data TIMESTAMPTZ,
  vendedor_responsavel UUID,
  vendedor_full_name TEXT,
  vendedor_email TEXT,
  vendedor_username TEXT,
  ultimo_vendedor_username TEXT,
  ultimo_vendedor_full_name TEXT,
  whatsapp_valido BOOLEAN,
  total_projects BIGINT,
  total_indicacoes BIGINT,
  produtos_indicados TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.company,
    a.phone,
    a.email,
    a.city,
    a.tier,
    a.status_funil,
    a.tag_prospeccao,
    a.data_primeiro_contato,
    a.data_ultimo_contato,
    a.ultimo_projeto_data,
    a.vendedor_responsavel,
    p.full_name AS vendedor_full_name,
    p.email AS vendedor_email,
    p.username AS vendedor_username,
    NULL::TEXT AS ultimo_vendedor_username,
    NULL::TEXT AS ultimo_vendedor_full_name,
    a.whatsapp_valido,
    (SELECT COUNT(*) FROM architect_projects ap WHERE ap.architect_id = a.id) AS total_projects,
    (SELECT COUNT(*) FROM architect_indications ai WHERE ai.architect_id = a.id) AS total_indicacoes,
    (SELECT ARRAY_AGG(DISTINCT ai.product_type) FROM architect_indications ai WHERE ai.architect_id = a.id) AS produtos_indicados
  FROM architects a
  LEFT JOIN profiles p ON a.vendedor_responsavel = p.id
  WHERE a.active = true
    AND (p_show_nao_contactados = false OR a.data_primeiro_contato IS NULL)
    AND (p_vendedor_id IS NULL OR a.vendedor_responsavel = p_vendedor_id)
    AND (p_status_funil IS NULL OR a.status_funil = p_status_funil)
    AND (p_cidade IS NULL OR a.city = p_cidade)
    AND (p_tier IS NULL OR a.tier = p_tier)
    AND (p_search IS NULL OR a.name ILIKE '%' || p_search || '%' OR a.company ILIKE '%' || p_search || '%' OR a.city ILIKE '%' || p_search || '%')
    AND (p_phone_search IS NULL OR a.phone ILIKE '%' || p_phone_search || '%')
  ORDER BY a.created_at DESC;
END;
$$;