
-- Dropar função existente para recriar com novo retorno
DROP FUNCTION IF EXISTS public.get_prospeccao_architects_optimized(boolean,uuid,text,text,text,text);

-- Recriar a RPC incluindo whatsapp_valido
CREATE OR REPLACE FUNCTION public.get_prospeccao_architects_optimized(
  p_show_nao_contactados boolean DEFAULT false, 
  p_vendedor_id uuid DEFAULT NULL::uuid, 
  p_status_funil text DEFAULT NULL::text, 
  p_cidade text DEFAULT NULL::text, 
  p_tier text DEFAULT NULL::text, 
  p_search text DEFAULT NULL::text
)
RETURNS TABLE(
  id uuid, 
  name text, 
  company text, 
  phone text, 
  city text, 
  email text, 
  instagram text, 
  birthday date, 
  tier text, 
  status_funil text, 
  data_primeiro_contato timestamp with time zone, 
  data_ultimo_contato timestamp with time zone, 
  ultimo_projeto_data timestamp with time zone, 
  vendedor_responsavel uuid, 
  vendedor_full_name text, 
  vendedor_email text, 
  vendedor_username text, 
  ultimo_vendedor_username text, 
  ultimo_vendedor_full_name text, 
  total_projects bigint, 
  total_indicacoes bigint, 
  produtos_indicados json,
  whatsapp_valido boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    ) FROM architect_indications ai WHERE ai.architect_id = a.id) as produtos_indicados,
    COALESCE(a.whatsapp_valido, true) as whatsapp_valido
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
$function$;
