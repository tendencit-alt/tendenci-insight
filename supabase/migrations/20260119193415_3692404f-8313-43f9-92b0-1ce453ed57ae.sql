-- Dropar e recriar a política de INSERT com condição mais permissiva
DROP POLICY IF EXISTS "Authenticated users can insert deleted records" ON public.deleted_records;

CREATE POLICY "Authenticated users can insert deleted records"
ON public.deleted_records
FOR INSERT
TO authenticated
WITH CHECK (true);