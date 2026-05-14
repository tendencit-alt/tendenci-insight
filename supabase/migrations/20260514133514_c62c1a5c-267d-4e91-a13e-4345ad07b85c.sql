DROP POLICY IF EXISTS "Admins gerenciam categorias" ON public.product_categories;

CREATE POLICY "Admins e owners gerenciam categorias"
ON public.product_categories
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
  )
);