-- Fix Admin Role Access Issues
-- This migration ensures that the admin user has proper privileges and can see all data
-- 
-- Issue: After recent changes, admin lost privileges to see data
-- Root cause: The comprehensive_user_privilege_overhaul migration may have changed admin's role
-- Solution: Ensure admin user has 'owner' role and fix RLS policies

BEGIN;

-- =============================================================================
-- STEP 1: Ensure admin user has 'owner' role
-- =============================================================================

-- Update admin user to have owner role (check by email or username)
UPDATE public.profiles 
SET 
    user_role = 'owner',
    updated_at = now()
WHERE 
    email = 'admin@system.local' 
    OR username = 'admin'
    OR id IN (
        SELECT id FROM auth.users 
        WHERE email = 'admin@system.local' 
        OR raw_user_meta_data->>'username' = 'admin'
    );

-- Log the update for verification
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count
    FROM public.profiles 
    WHERE (email = 'admin@system.local' OR username = 'admin')
    AND user_role = 'owner';
    
    IF admin_count > 0 THEN
        RAISE NOTICE 'Successfully updated % admin user(s) to owner role', admin_count;
    ELSE
        RAISE WARNING 'No admin user found to update. Admin may need to be created or identified differently.';
    END IF;
END $$;

-- =============================================================================
-- STEP 2: Fix the is_admin_user() function to be more robust
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
BEGIN
    -- Check if current user has admin privileges
    -- Admin users are those with 'owner' or 'manager' roles
    -- Also check for admin email/username as fallback
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (
            user_role IN ('owner', 'manager')
            OR email = 'admin@system.local'
            OR username = 'admin'
        )
    );
END;
$$;

-- =============================================================================
-- STEP 3: Ensure RLS policies allow admin access to all critical tables
-- =============================================================================

-- Drop and recreate admin SELECT policies for critical tables to ensure they work

-- Halls table
DROP POLICY IF EXISTS "Admins can view all halls" ON public.halls;
CREATE POLICY "Admins can view all halls"
ON public.halls
FOR SELECT
TO authenticated
USING (public.is_admin_user());

-- Ensure public read access for halls (if needed for occupancy calculations)
DROP POLICY IF EXISTS "All users can view halls" ON public.halls;
CREATE POLICY "All users can view halls"
ON public.halls
FOR SELECT
TO authenticated
USING (true);

-- Bookings table
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins can view all bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (public.is_admin_user());

-- Student registrations table
DROP POLICY IF EXISTS "Admins can view all registrations" ON public.student_registrations;
CREATE POLICY "Admins can view all registrations"
ON public.student_registrations
FOR SELECT
TO authenticated
USING (public.is_admin_user());

-- Payment records table
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payment_records;
CREATE POLICY "Admins can view all payments"
ON public.payment_records
FOR SELECT
TO authenticated
USING (public.is_admin_user());

-- Students table
DROP POLICY IF EXISTS "Admins can view all students" ON public.students;
CREATE POLICY "Admins can view all students"
ON public.students
FOR SELECT
TO authenticated
USING (public.is_admin_user());

-- Teachers table
DROP POLICY IF EXISTS "Admins can view all teachers" ON public.teachers;
CREATE POLICY "Admins can view all teachers"
ON public.teachers
FOR SELECT
TO authenticated
USING (public.is_admin_user());

-- =============================================================================
-- STEP 4: Grant necessary permissions for RPC functions
-- =============================================================================

-- Ensure admin users can execute critical RPC functions
GRANT EXECUTE ON FUNCTION public.get_financial_summary(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hall_average_occupancy_per_slot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hall_actual_occupancy_updated() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_payments_sum(integer, integer) TO authenticated;

-- =============================================================================
-- STEP 5: Create a helper function to verify admin access
-- =============================================================================

CREATE OR REPLACE FUNCTION public.verify_admin_access()
RETURNS TABLE (
    has_admin_role BOOLEAN,
    user_id UUID,
    user_email TEXT,
    user_role user_role,
    can_access_halls BOOLEAN,
    can_access_bookings BOOLEAN,
    can_access_students BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    RETURN QUERY
    SELECT 
        public.is_admin_user() as has_admin_role,
        p.id as user_id,
        p.email as user_email,
        p.user_role as user_role,
        EXISTS(SELECT 1 FROM public.halls LIMIT 1) as can_access_halls,
        EXISTS(SELECT 1 FROM public.bookings LIMIT 1) as can_access_bookings,
        EXISTS(SELECT 1 FROM public.students LIMIT 1) as can_access_students
    FROM public.profiles p
    WHERE p.id = current_user_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.verify_admin_access() TO authenticated;

-- =============================================================================
-- STEP 6: Add a trigger to prevent accidental admin role changes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.protect_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Protect admin user from losing owner role
    IF (OLD.email = 'admin@system.local' OR OLD.username = 'admin') 
       AND NEW.user_role NOT IN ('owner', 'manager') THEN
        NEW.user_role := 'owner';
        RAISE NOTICE 'Admin user role protected - keeping owner role';
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS protect_admin_role_trigger ON public.profiles;
CREATE TRIGGER protect_admin_role_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_admin_role();

COMMIT;

-- Verification query (run manually after migration)
-- SELECT * FROM public.verify_admin_access();