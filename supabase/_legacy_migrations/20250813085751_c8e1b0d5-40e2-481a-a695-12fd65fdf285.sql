-- Fix infinite recursion in RLS policies by creating security definer functions
-- This prevents the circular reference issue when policies query the same table they protect

-- 1. Drop existing problematic policies to avoid conflicts
DROP POLICY IF EXISTS "Users can only see and edit their own profile data" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can see all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by owners and managers" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile and admins can view all" ON public.profiles;

-- 2. Create security definer function to check user permissions without recursion
CREATE OR REPLACE FUNCTION public.get_current_user_permissions()
RETURNS TABLE(
  user_id UUID,
  user_role user_role,
  app_role app_role,
  is_admin BOOLEAN
) 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    COALESCE(p.user_role, 'space_manager'::user_role) as user_role,
    COALESCE(p.role, 'USER'::app_role) as app_role,
    (p.role = 'ADMIN'::app_role OR p.user_role IN ('owner'::user_role, 'manager'::user_role)) as is_admin
  FROM public.profiles p 
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

-- 3. Create simple check functions to use in policies
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.get_current_user_permissions()), 
    false
  );
$$;

-- 4. Create new safe RLS policies for profiles table
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles  
FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_admin());

-- 5. Ensure all admin users have proper permissions for navigation
-- Update any profiles that should have admin access
UPDATE public.profiles 
SET 
  user_role = 'owner'::user_role,
  role = 'ADMIN'::app_role,
  updated_at = now()
WHERE email IN (
  'admin@admin.com',
  'hanyslmm@gmail.com'
) OR id IN (
  '00000000-0000-0000-0000-000000000001'
);

-- 6. Create function for menu access control (avoiding recursion)
CREATE OR REPLACE FUNCTION public.user_can_access_admin_features(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_id
    AND (p.role = 'ADMIN'::app_role OR p.user_role IN ('owner'::user_role, 'manager'::user_role))
  );
$$;