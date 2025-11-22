-- Dropar função existente para poder atualizar o tipo de retorno
DROP FUNCTION IF EXISTS public.get_prospeccao_architects_optimized(BOOLEAN, UUID, TEXT, TEXT, TEXT, TEXT);

-- Recriar função com novos campos de indicações
CREATE OR REPLACE FUNCTION public.get_prospeccao_architects_optimized(
  p_show_nao_contactados BOOLEAN DEFAULT false,
  p_vendedor_id UUID DEFAULT NULL,
  p_status_funil TEXT DEFAULT NULL,
  p_cidade TEXT DEFAULT NULL,
  p_tier TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  company TEXT,
  phone TEXT,
  city TEXT,
  email TEXT,
  instagram TEXT,
  birthday DATE,
  tier TEXT,
  status_funil TEXT,
  data_primeiro_contato TIMESTAMPTZ,
  data_ultimo_contato TIMESTAMPTZ,
  ultimo_projeto_data TIMESTAMPTZ,
  vendedor_responsavel UUID,
  vendedor_full_name TEXT,
  vendedor_email TEXT,
  vendedor_username TEXT,
  ultimo_vendedor_username TEXT,
  ultimo_vendedor_full_name TEXT,
  total_projects BIGINT,
  total_indicacoes BIGINT,
  produtos_indicados JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.company,
    a.phone,
    a.city,
    a.email,
    a.instagram,
    a.birthday,
    a.tier,
    a.status_funil,
    a.data_primeiro_contato,
    a.data_ultimo_contato,
    a.ultimo_projeto_data,
    a.vendedor_responsavel,
    p.full_name as vendedor_full_name,
    p.email as vendedor_email,
    p.username as vendedor_username,
    (SELECT lp.username FROM tendenci_prospec_arq_logs logs
     INNER JOIN profiles lp ON logs.enviado_por = lp.id
     WHERE logs.architect_id = a.id
     ORDER BY logs.created_at DESC LIMIT 1) as ultimo_vendedor_username,
    (SELECT lp.full_name FROM tendenci_prospec_arq_logs logs
     INNER JOIN profiles lp ON logs.enviado_por = lp.id
     WHERE logs.architect_id = a.id
     ORDER BY logs.created_at DESC LIMIT 1) as ultimo_vendedor_full_name,
    (SELECT COUNT(*)::bigint FROM projects pr WHERE pr.architect_id = a.id) + 
    (SELECT COUNT(*)::bigint FROM architect_projects ap WHERE ap.architect_id = a.id) as total_projects,
    (SELECT COUNT(*)::bigint FROM architect_indications ai WHERE ai.architect_id = a.id) as total_indicacoes,
    (SELECT COALESCE(
      json_agg(DISTINCT ai.product_type) FILTER (WHERE ai.product_type IS NOT NULL),
      '[]'::json
    ) FROM architect_indications ai WHERE ai.architect_id = a.id) as produtos_indicados
  FROM architects a
  LEFT JOIN profiles p ON a.vendedor_responsavel = p.id
  WHERE a.active = true
    AND (NOT p_show_nao_contactados OR a.data_primeiro_contato IS NULL)
    AND (p_vendedor_id IS NULL OR a.vendedor_responsavel = p_vendedor_id)
    AND (p_status_funil IS NULL OR a.status_funil = p_status_funil)
    AND (p_cidade IS NULL OR a.city = p_cidade)
    AND (p_tier IS NULL OR a.tier = p_tier)
    AND (p_search IS NULL OR 
         a.name ILIKE '%' || p_search || '%' OR
         a.company ILIKE '%' || p_search || '%' OR
         a.city ILIKE '%' || p_search || '%')
  ORDER BY a.created_at DESC;
END;
$$;