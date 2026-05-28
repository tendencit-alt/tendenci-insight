
-- Unified read-only view for Contatos hub.
-- security_invoker=on => underlying RLS on clients/suppliers is enforced per caller.
DROP VIEW IF EXISTS public.v_contatos_unified;

CREATE VIEW public.v_contatos_unified
WITH (security_invoker=on) AS
SELECT
  'cliente'::text       AS tipo,
  c.id                  AS id,
  c.tenant_id           AS tenant_id,
  COALESCE(NULLIF(c.razao_social,''), c.name) AS nome,
  c.nome_fantasia       AS nome_fantasia,
  c.cpf_cnpj            AS cpf_cnpj,
  c.email               AS email,
  c.phone               AS phone,
  c.city                AS city,
  c.state               AS state,
  c.created_at          AS created_at
FROM public.clients c
UNION ALL
SELECT
  'fornecedor'::text    AS tipo,
  s.id                  AS id,
  s.tenant_id           AS tenant_id,
  COALESCE(NULLIF(s.trade_name,''), s.name) AS nome,
  s.trade_name          AS nome_fantasia,
  s.cpf_cnpj            AS cpf_cnpj,
  s.email               AS email,
  s.phone               AS phone,
  s.city                AS city,
  s.state               AS state,
  s.created_at          AS created_at
FROM public.suppliers s;

GRANT SELECT ON public.v_contatos_unified TO authenticated;
