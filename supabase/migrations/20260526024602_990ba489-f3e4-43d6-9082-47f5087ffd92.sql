DROP POLICY IF EXISTS "Admins deletam produtos" ON public.products;
CREATE POLICY "Autenticados deletam produtos" ON public.products FOR DELETE USING (auth.uid() IS NOT NULL);