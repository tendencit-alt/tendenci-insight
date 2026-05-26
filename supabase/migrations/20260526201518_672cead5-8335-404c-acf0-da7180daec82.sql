
ALTER TABLE public.fin_chart_accounts DISABLE TRIGGER USER;

-- Generic remap for every table that has a chart_account_id FK to fin_chart_accounts
DO $$
DECLARE
  r RECORD;
  sql TEXT;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass::text AS table_name,
           a.attname AS col_name,
           EXISTS (SELECT 1 FROM information_schema.columns ic
                   WHERE ic.table_schema='public'
                     AND ic.table_name = (SELECT relname FROM pg_class WHERE oid = c.conrelid)
                     AND ic.column_name = 'tenant_id') AS has_tenant
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.fin_chart_accounts'::regclass
  LOOP
    IF r.has_tenant THEN
      sql := format(
        'UPDATE %s tgt_tbl
           SET %I = match.id
         FROM public.fin_chart_accounts src
         JOIN public.fin_chart_accounts match
           ON match.code = src.code AND match.tenant_id IS NOT NULL
         WHERE tgt_tbl.%I = src.id
           AND src.tenant_id IS NULL
           AND match.tenant_id = tgt_tbl.tenant_id;',
        r.table_name, r.col_name, r.col_name);
      EXECUTE sql;
    END IF;
    -- Null out any remaining references (rows without tenant_id column or no matching tenant)
    sql := format(
      'UPDATE %s SET %I = NULL WHERE %I IN (SELECT id FROM public.fin_chart_accounts WHERE tenant_id IS NULL);',
      r.table_name, r.col_name, r.col_name);
    EXECUTE sql;
  END LOOP;
END$$;

-- Self-reference (parent_id) on chart accounts
UPDATE public.fin_chart_accounts c
SET parent_id = tgt.id
FROM public.fin_chart_accounts p
JOIN public.fin_chart_accounts tgt
  ON tgt.code = p.code AND tgt.tenant_id IS NOT NULL
WHERE c.parent_id = p.id
  AND p.tenant_id IS NULL
  AND tgt.tenant_id = c.tenant_id;

UPDATE public.fin_chart_accounts SET parent_id = NULL
WHERE parent_id IN (SELECT id FROM public.fin_chart_accounts WHERE tenant_id IS NULL);

DELETE FROM public.fin_chart_accounts WHERE tenant_id IS NULL;

ALTER TABLE public.fin_chart_accounts ENABLE TRIGGER USER;

CREATE UNIQUE INDEX IF NOT EXISTS fin_chart_accounts_tenant_code_uk
  ON public.fin_chart_accounts (tenant_id, code);
