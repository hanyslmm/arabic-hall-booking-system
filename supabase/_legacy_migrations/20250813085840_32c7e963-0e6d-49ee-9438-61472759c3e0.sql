-- Emergency fix for infinite recursion in profiles RLS policies
-- Drop ALL existing policies on profiles table first, then create safe ones

-- 1. Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can only see and edit their own profile data" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can see all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by owners and managers" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile and admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins to manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;

-- 2. Create security definer function to check admin status without recursion
CREATE OR REPLACE FUNCTION public.check_is_admin()
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

-- 3. Create simple, safe RLS policies using the security definer function
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" 
ON public.profiles
FOR SELECT
TO authenticated
USING (public.check_is_admin());

CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_admin"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.check_is_admin())
WITH CHECK (public.check_is_admin());

CREATE POLICY "profiles_insert_admin"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.check_is_admin());

-- 4. Ensure known admin accounts have proper privileges
UPDATE public.profiles 
SET 
  user_role = 'owner'::user_role,
  role = 'ADMIN'::app_role,
  updated_at = now()
WHERE (email IN ('admin@admin.com', 'hanyslmm@gmail.com') OR id = '00000000-0000-0000-0000-000000000001')
AND (user_role != 'owner'::user_role OR role != 'ADMIN'::app_role);