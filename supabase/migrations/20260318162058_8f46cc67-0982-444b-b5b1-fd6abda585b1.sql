-- Tighten RLS policies for strategic resource account configs
DROP POLICY IF EXISTS "Authenticated users can insert strategic resource account configs" ON public.fin_strategic_resource_account_configs;
DROP POLICY IF EXISTS "Authenticated users can update strategic resource account configs" ON public.fin_strategic_resource_account_configs;
DROP POLICY IF EXISTS "Authenticated users can delete strategic resource account configs" ON public.fin_strategic_resource_account_configs;

CREATE POLICY "Authenticated users can insert strategic resource account configs"
ON public.fin_strategic_resource_account_configs
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update strategic resource account configs"
ON public.fin_strategic_resource_account_configs
FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete strategic resource account configs"
ON public.fin_strategic_resource_account_configs
FOR DELETE
TO authenticated
USING (auth.role() = 'authenticated');