-- Fix orphaned chart accounts: link children to parent by code prefix within same tenant
UPDATE fin_chart_accounts c
SET parent_id = p.id
FROM fin_chart_accounts p
WHERE c.tenant_id IS NOT NULL
  AND c.parent_id IS NULL
  AND c.code LIKE '%.%'
  AND p.tenant_id = c.tenant_id
  AND p.code = regexp_replace(c.code, '\.[^.]+$', '');