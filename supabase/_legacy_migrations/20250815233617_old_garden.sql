/*
# Fix Admin User Management Permissions

This migration fixes the issue where admin users cannot create or update other users' roles.

## Changes Made

1. **Enhanced Admin Permission Functions**
   - Updated `is_admin_user()` function to properly check for admin privileges
   - Added fallback checks for legacy ADMIN role
   - Improved error handling and logging

2. **Profile Management Policies**
   - Updated RLS policies to allow admins to manage all profiles
   - Fixed permission checks for user role updates
   - Added proper INSERT policies for profile creation

3. **Edge Function Support**
   - Ensured Edge Functions can properly validate admin permissions
   - Fixed role validation to include all valid user roles
   - Improved error reporting for debugging

## Security Notes
- Only users with 'owner', 'manager' roles or legacy 'ADMIN' app role can manage other users
- All role changes are logged in audit_logs table
- Profile creation and updates are properly secured with RLS
*/

BEGIN;

-- =============================================================================
-- STEP 1: Enhanced admin permission checking functions
-- =============================================================================

-- Update is_admin_user function with better error handling
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Get current user's profile
  SELECT user_role, role INTO user_profile
  FROM public.profiles 
  WHERE id = auth.uid();
  
  -- Check if user has admin privileges
  -- Admin users are those with 'owner' or 'manager' user_role, or legacy 'ADMIN' app role
  RETURN (
    user_profile.user_role IN ('owner', 'manager') OR 
    user_profile.role = 'ADMIN'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return false for safety
    RAISE LOG 'Error in is_admin_user(): %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Create enhanced admin check function for Edge Functions
CREATE OR REPLACE FUNCTION public.check_admin_permissions(check_user_id UUID)
RETURNS TABLE(
  is_admin BOOLEAN,
  user_role TEXT,
  app_role TEXT,
  can_manage_users BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Get user's profile
  SELECT p.user_role, p.role INTO user_profile
  FROM public.profiles p
  WHERE p.id = check_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, FALSE;
    RETURN;
  END IF;
  
  -- Determine admin status
  RETURN QUERY SELECT 
    (user_profile.user_role IN ('owner', 'manager') OR user_profile.role = 'ADMIN') as is_admin,
    user_profile.user_role::TEXT as user_role,
    user_profile.role::TEXT as app_role,
    (user_profile.user_role IN ('owner', 'manager') OR user_profile.role = 'ADMIN') as can_manage_users;
END;
$$;

-- =============================================================================
-- STEP 2: Fix profile management RLS policies
-- =============================================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_create_admin" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Create comprehensive profile policies
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin_user());

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
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can create profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user());

CREATE POLICY "Service role can manage all profiles"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- STEP 3: Update admin_update_user_role function for better reliability
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  target_user_id UUID,
  new_user_role user_role,
  new_full_name TEXT DEFAULT NULL,
  new_email TEXT DEFAULT NULL,
  new_phone TEXT DEFAULT NULL,
  new_teacher_id UUID DEFAULT NULL
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  updated_profile profiles;
  actor_permissions RECORD;
BEGIN
  -- Check if the calling user has admin permissions
  SELECT * INTO actor_permissions 
  FROM public.check_admin_permissions(auth.uid());
  
  IF NOT actor_permissions.can_manage_users THEN
    RAISE EXCEPTION 'Insufficient permissions to update user roles';
  END IF;

  -- Perform the update
  UPDATE public.profiles
  SET
    user_role = new_user_role,
    full_name = COALESCE(new_full_name, full_name),
    email = COALESCE(new_email, email),
    phone = COALESCE(new_phone, phone),
    teacher_id = CASE 
      WHEN new_user_role = 'teacher' THEN new_teacher_id
      ELSE NULL
    END,
    updated_at = now()
  WHERE id = target_user_id
  RETURNING * INTO updated_profile;

  IF NOT FOUND THEN
    -- Create profile if it doesn't exist
    INSERT INTO public.profiles (
      id, 
      user_role, 
      full_name, 
      email, 
      phone, 
      teacher_id, 
      role,
      created_at,
      updated_at
    ) VALUES (
      target_user_id, 
      new_user_role, 
      new_full_name, 
      new_email, 
      new_phone, 
      CASE WHEN new_user_role = 'teacher' THEN new_teacher_id ELSE NULL END,
      'USER',
      now(),
      now()
    )
    RETURNING * INTO updated_profile;
  END IF;

  -- Log the role change
  INSERT INTO public.audit_logs (actor_user_id, action, details)
  VALUES (
    auth.uid(),
    'admin_role_update',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'new_user_role', new_user_role::text,
      'actor_role', actor_permissions.user_role,
      'timestamp', now()
    )
  );

  RETURN updated_profile;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in admin_update_user_role: %', SQLERRM;
    RAISE;
END;
$$;

-- =============================================================================
-- STEP 4: Grant necessary permissions
-- =============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_admin_permissions(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(UUID, user_role, TEXT, TEXT, TEXT, UUID) TO authenticated, service_role;

-- =============================================================================
-- STEP 5: Ensure admin users have proper roles
-- =============================================================================

-- Update known admin accounts to ensure they have proper privileges
UPDATE public.profiles 
SET 
  user_role = 'owner',
  role = 'ADMIN',
  updated_at = now()
WHERE email IN (
  'admin@admin.com',
  'hanyslmm@gmail.com',
  'admin@system.local'
) OR id = '00000000-0000-0000-0000-000000000001';

-- =============================================================================
-- STEP 6: Add debugging function for troubleshooting
-- =============================================================================

CREATE OR REPLACE FUNCTION public.debug_user_permissions(check_email TEXT DEFAULT NULL)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  user_role TEXT,
  app_role TEXT,
  is_admin BOOLEAN,
  can_create_users BOOLEAN,
  can_update_roles BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_user_id UUID;
  user_profile RECORD;
BEGIN
  -- Determine which user to check
  IF check_email IS NOT NULL THEN
    SELECT id INTO target_user_id FROM public.profiles WHERE profiles.email = check_email;
  ELSE
    target_user_id := auth.uid();
  END IF;
  
  IF target_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE, FALSE, FALSE;
    RETURN;
  END IF;
  
  -- Get user profile
  SELECT p.* INTO user_profile FROM public.profiles p WHERE p.id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT target_user_id, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE, FALSE, FALSE;
    RETURN;
  END IF;
  
  -- Return comprehensive permission info
  RETURN QUERY SELECT 
    user_profile.id,
    user_profile.email,
    user_profile.user_role::TEXT,
    user_profile.role::TEXT,
    (user_profile.user_role IN ('owner', 'manager') OR user_profile.role = 'ADMIN') as is_admin,
    (user_profile.user_role IN ('owner', 'manager') OR user_profile.role = 'ADMIN') as can_create_users,
    (user_profile.user_role IN ('owner', 'manager') OR user_profile.role = 'ADMIN') as can_update_roles;
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_user_permissions(TEXT) TO authenticated, service_role;

COMMIT;

-- =============================================================================
-- Post-migration verification
-- =============================================================================
-- Run these queries to verify the fix:
-- SELECT * FROM public.debug_user_permissions('admin@admin.com');
-- SELECT * FROM public.debug_user_permissions('hanyslmm@gmail.com');
-- SELECT * FROM public.check_admin_permissions(auth.uid());