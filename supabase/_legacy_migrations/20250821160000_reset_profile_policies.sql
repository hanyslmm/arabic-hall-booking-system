-- Step 1: Forcefully drop all existing RLS policies on the profiles table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles;';
    END LOOP;
END
$$;

-- Step 2: Create a single, permissive policy for admins ('owner' or 'manager')
CREATE POLICY "Admins have full access to profiles"
ON public.profiles
FOR ALL
USING (
  (get_my_claim('user_role') ->> 0)::text IN ('owner', 'manager')
)
WITH CHECK (
  (get_my_claim('user_role') ->> 0)::text IN ('owner', 'manager')
);

-- Step 3: Ensure all authenticated users can at least see their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);
