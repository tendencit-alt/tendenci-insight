CREATE POLICY "Owner can view all profiles"
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.is_owner());