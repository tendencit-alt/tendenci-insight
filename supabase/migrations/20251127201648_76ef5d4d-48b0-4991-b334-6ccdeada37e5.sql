
-- Recriar função com search_path seguro
CREATE OR REPLACE FUNCTION public.http_post(
  url TEXT,
  body JSONB DEFAULT '{}'::jsonb,
  params JSONB DEFAULT '{}'::jsonb,
  headers JSONB DEFAULT '{}'::jsonb,
  timeout_milliseconds INTEGER DEFAULT 5000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  response_id BIGINT;
BEGIN
  -- Chamar net.http_post que é a função real da extensão pg_net
  SELECT net.http_post(
    url := http_post.url,
    body := http_post.body,
    params := http_post.params,
    headers := http_post.headers,
    timeout_milliseconds := http_post.timeout_milliseconds
  ) INTO response_id;
  
  RETURN jsonb_build_object('id', response_id);
END;
$$;
