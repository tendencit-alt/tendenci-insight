-- Fix multi-tenant uniqueness on fee_supplier_configs
ALTER TABLE public.fee_supplier_configs DROP CONSTRAINT IF EXISTS fee_supplier_configs_fee_type_key;

-- Deduplicate any (tenant_id, fee_type) collisions before adding the constraint
DELETE FROM public.fee_supplier_configs a
USING public.fee_supplier_configs b
WHERE a.ctid < b.ctid
  AND a.tenant_id IS NOT DISTINCT FROM b.tenant_id
  AND a.fee_type = b.fee_type;

ALTER TABLE public.fee_supplier_configs
  ADD CONSTRAINT fee_supplier_configs_tenant_fee_type_key UNIQUE (tenant_id, fee_type);