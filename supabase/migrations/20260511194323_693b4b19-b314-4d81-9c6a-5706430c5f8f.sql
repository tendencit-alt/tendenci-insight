DROP POLICY IF EXISTS "Admins can manage profile types" ON public.profile_types;
CREATE POLICY "Admins can manage profile types" ON public.profile_types
AS PERMISSIVE FOR ALL
USING (
  public.is_owner()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','owner'))
)
WITH CHECK (
  public.is_owner()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','owner'))
);

-- Mirror for profile_type_permissions if a similar admin-only policy exists
DROP POLICY IF EXISTS "Admins can manage profile type permissions" ON public.profile_type_permissions;
CREATE POLICY "Admins can manage profile type permissions" ON public.profile_type_permissions
AS PERMISSIVE FOR ALL
USING (
  public.is_owner()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','owner'))
)
WITH CHECK (
  public.is_owner()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','owner'))
);