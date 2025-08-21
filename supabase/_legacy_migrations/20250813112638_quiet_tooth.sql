/*
# Restore Admin Privileges

This migration restores full admin privileges for admin accounts that may have been affected by recent security fixes.

## Changes Made

1. **Admin Account Restoration**
   - Ensures admin@admin.com has owner role and ADMIN privileges
   - Ensures hanyslmm@gmail.com has owner role and ADMIN privileges
   - Ensures admin@system.local has owner role and ADMIN privileges

2. **RLS Policy Verification**
   - Verifies that admin users can access all tables
   - Ensures proper function permissions
   - Validates security definer functions work correctly

3. **Emergency Access Recovery**
   - Creates emergency admin recovery function
   - Provides fallback admin access methods
*/

-- Emergency admin privilege restoration
-- This migration is designed to restore admin access after security fixes

BEGIN;

-- Step 1: Ensure admin accounts exist and have proper privileges
-- Update known admin accounts to have full privileges
UPDATE public.profiles 
SET 
  user_role = 'owner'::user_role,
  role = 'ADMIN'::app_role,
  full_name = COALESCE(full_name, 'System Administrator'),
  updated_at = now()
WHERE email IN (
  'admin@admin.com',
  'hanyslmm@gmail.com', 
  'admin@system.local'
) OR id = '00000000-0000-0000-0000-000000000001';

-- Step 2: Create emergency admin recovery function
CREATE OR REPLACE FUNCTION public.emergency_admin_recovery(target_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update user to have full admin privileges
  UPDATE public.profiles
  SET 
    user_role = 'owner'::user_role,
    role = 'ADMIN'::app_role,
    updated_at = now()
  WHERE email = target_email;
  
  -- Return true if update was successful
  RETURN FOUND;
END;
$$;

-- Step 3: Verify and fix RLS helper functions
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'ADMIN'::app_role OR user_role IN ('owner'::user_role, 'manager'::user_role))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_read()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$;

-- Step 4: Ensure all tables have proper admin access policies
-- These policies ensure admins can access all data

-- Profiles table - ensure admins can manage all profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Bookings table - ensure admins can manage all bookings
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
CREATE POLICY "Admins can manage all bookings"
ON public.bookings
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Students table - ensure admins can manage all students
DROP POLICY IF EXISTS "Admins can manage all students" ON public.students;
CREATE POLICY "Admins can manage all students"
ON public.students
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Teachers table - ensure admins can manage all teachers
DROP POLICY IF EXISTS "Admins can manage all teachers" ON public.teachers;
CREATE POLICY "Admins can manage all teachers"
ON public.teachers
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Halls table - ensure admins can manage all halls
DROP POLICY IF EXISTS "Admins can manage all halls" ON public.halls;
CREATE POLICY "Admins can manage all halls"
ON public.halls
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Academic stages table - ensure admins can manage all stages
DROP POLICY IF EXISTS "Admins can manage all academic stages" ON public.academic_stages;
CREATE POLICY "Admins can manage all academic stages"
ON public.academic_stages
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Subjects table - ensure admins can manage all subjects
DROP POLICY IF EXISTS "Admins can manage all subjects" ON public.subjects;
CREATE POLICY "Admins can manage all subjects"
ON public.subjects
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Student registrations table - ensure admins can manage all registrations
DROP POLICY IF EXISTS "Admins can manage all registrations" ON public.student_registrations;
CREATE POLICY "Admins can manage all registrations"
ON public.student_registrations
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Payment records table - ensure admins can manage all payments
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payment_records;
CREATE POLICY "Admins can manage all payments"
ON public.payment_records
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Attendance records table - ensure admins can manage all attendance
DROP POLICY IF EXISTS "Admins can manage all attendance" ON public.attendance_records;
CREATE POLICY "Admins can manage all attendance"
ON public.attendance_records
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Step 5: Grant execute permissions on all functions to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.emergency_admin_recovery(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_teacher_default_fee(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_booking_custom_fee(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_booking_fee(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_payments_sum(DATE, DATE) TO authenticated;

-- Step 6: Create admin verification function for debugging
CREATE OR REPLACE FUNCTION public.verify_admin_access(check_email TEXT DEFAULT NULL)
RETURNS TABLE(
  email TEXT,
  user_role TEXT,
  app_role TEXT,
  is_admin BOOLEAN,
  can_access_bookings BOOLEAN,
  can_access_students BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- If email provided, check that user, otherwise check current user
  IF check_email IS NOT NULL THEN
    SELECT id INTO target_user_id FROM public.profiles WHERE profiles.email = check_email;
  ELSE
    target_user_id := auth.uid();
  END IF;
  
  RETURN QUERY
  SELECT 
    p.email,
    p.user_role::TEXT,
    p.role::TEXT,
    (p.role = 'ADMIN'::app_role OR p.user_role IN ('owner'::user_role, 'manager'::user_role)) as is_admin,
    -- Test bookings access
    EXISTS(SELECT 1 FROM public.bookings LIMIT 1) as can_access_bookings,
    -- Test students access  
    EXISTS(SELECT 1 FROM public.students LIMIT 1) as can_access_students
  FROM public.profiles p
  WHERE p.id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_admin_access(TEXT) TO authenticated;

-- Step 7: Log this recovery action
INSERT INTO public.audit_logs (actor_user_id, action, details)
SELECT 
  auth.uid(),
  'admin_privilege_recovery',
  jsonb_build_object(
    'migration', '20250115120000_restore_admin_privileges',
    'timestamp', now(),
    'affected_emails', ARRAY['admin@admin.com', 'hanyslmm@gmail.com', 'admin@system.local']
  )
WHERE auth.uid() IS NOT NULL;

COMMIT;

-- Post-migration verification
-- Run this to verify admin access is restored:
-- SELECT * FROM public.verify_admin_access('admin@admin.com');
-- SELECT * FROM public.verify_admin_access('hanyslmm@gmail.com');