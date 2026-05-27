
-- Prevent non-owners from setting is_owner=true on their own profile
CREATE OR REPLACE FUNCTION public.profiles_block_is_owner_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_owner IS DISTINCT FROM OLD.is_owner THEN
    IF NOT public.is_owner() THEN
      RAISE EXCEPTION 'Only platform owners can modify is_owner';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_block_is_owner_escalation ON public.profiles;
CREATE TRIGGER trg_profiles_block_is_owner_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profiles_block_is_owner_escalation();

-- Belt-and-suspenders: RESTRICTIVE UPDATE policy enforcing is_owner immutability for non-owners
DROP POLICY IF EXISTS "restrict_profiles_is_owner_immutable" ON public.profiles;
CREATE POLICY "restrict_profiles_is_owner_immutable" ON public.profiles
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (true)
WITH CHECK (
  public.is_owner()
  OR is_owner = COALESCE((SELECT p.is_owner FROM public.profiles p WHERE p.id = profiles.id), false)
);
