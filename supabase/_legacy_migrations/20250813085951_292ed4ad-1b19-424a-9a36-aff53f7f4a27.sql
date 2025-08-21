-- Emergency: Completely rebuild profiles RLS to fix infinite recursion
-- This migration will clear ALL profiles policies and create clean ones

-- Step 1: Drop ALL existing policies on profiles (complete cleanup)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END
$$;

-- Step 2: Disable RLS temporarily to fix the recursion
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 3: Ensure admin users have correct privileges (directly update without RLS)
UPDATE public.profiles 
SET 
  user_role = 'owner'::user_role,
  role = 'ADMIN'::app_role,
  updated_at = now()
WHERE email IN ('admin@admin.com', 'hanyslmm@gmail.com')
   OR id = '00000000-0000-0000-0000-000000000001';

-- Step 4: Create the security definer function (clean approach)
CREATE OR REPLACE FUNCTION public.check_user_admin_status()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND (p.role = 'ADMIN'::app_role OR p.user_role IN ('owner'::user_role, 'manager'::user_role))
  );
$$;

-- Step 5: Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Create minimal, safe policies
CREATE POLICY "profiles_read_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "profiles_read_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.check_user_admin_status());

CREATE POLICY "profiles_write_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_write_admin"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.check_user_admin_status())
WITH CHECK (public.check_user_admin_status());

CREATE POLICY "profiles_create_admin"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.check_user_admin_status());