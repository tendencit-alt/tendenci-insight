
DO $$
DECLARE
  _tid uuid;
  _tbl text;
BEGIN
  SELECT id INTO _tid FROM tenants WHERE name ILIKE '%Tendenci%' LIMIT 1;
  IF _tid IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE orders DISABLE TRIGGER USER;
  ALTER TABLE order_items DISABLE TRIGGER USER;
  ALTER TABLE fin_payables DISABLE TRIGGER USER;
  ALTER TABLE fin_receivables DISABLE TRIGGER USER;
  ALTER TABLE fin_ledger_entries DISABLE TRIGGER USER;

  -- Use dynamic SQL to find and delete from ALL tables with tenant_id column
  FOR _tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'tenant_id'
      AND table_schema = 'public'
      AND table_name != 'tenants'
    ORDER BY table_name
  LOOP
    BEGIN
      EXECUTE format('DELETE FROM %I WHERE tenant_id = $1', _tbl) USING _tid;
    EXCEPTION WHEN foreign_key_violation THEN
      -- will retry in second pass
      NULL;
    END;
  END LOOP;

  -- Second pass for any remaining FK violations
  FOR _tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'tenant_id'
      AND table_schema = 'public'
      AND table_name != 'tenants'
    ORDER BY table_name
  LOOP
    BEGIN
      EXECUTE format('DELETE FROM %I WHERE tenant_id = $1', _tbl) USING _tid;
    EXCEPTION WHEN foreign_key_violation THEN
      NULL;
    END;
  END LOOP;

  -- Third pass
  FOR _tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'tenant_id'
      AND table_schema = 'public'
      AND table_name != 'tenants'
    ORDER BY table_name
  LOOP
    EXECUTE format('DELETE FROM %I WHERE tenant_id = $1', _tbl) USING _tid;
  END LOOP;

  -- Now delete the tenant itself
  DELETE FROM tenants WHERE id = _tid;

  ALTER TABLE orders ENABLE TRIGGER USER;
  ALTER TABLE order_items ENABLE TRIGGER USER;
  ALTER TABLE fin_payables ENABLE TRIGGER USER;
  ALTER TABLE fin_receivables ENABLE TRIGGER USER;
  ALTER TABLE fin_ledger_entries ENABLE TRIGGER USER;
END;
$$;
