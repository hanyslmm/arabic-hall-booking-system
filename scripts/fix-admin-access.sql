-- Fix Admin Access Issues Script
-- Run this script in your Supabase SQL Editor to restore admin privileges
-- 
-- This script will:
-- 1. Ensure the admin user has 'owner' role
-- 2. Fix permission functions
-- 3. Verify admin access

-- =============================================================================
-- STEP 1: Check current admin user status
-- =============================================================================

SELECT 
    id,
    email,
    username,
    user_role,
    created_at,
    updated_at
FROM public.profiles 
WHERE email = 'admin@system.local' OR username = 'admin';

-- =============================================================================
-- STEP 2: Update admin user to have owner role
-- =============================================================================

UPDATE public.profiles 
SET 
    user_role = 'owner',
    updated_at = now()
WHERE 
    email = 'admin@system.local' 
    OR username = 'admin';

-- Verify the update
SELECT 
    id,
    email,
    username,
    user_role,
    'Role updated to owner' as status
FROM public.profiles 
WHERE email = 'admin@system.local' OR username = 'admin';

-- =============================================================================
-- STEP 3: Create or replace the is_admin_user function
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
-- STEP 4: Test admin access
-- =============================================================================

-- Check if current user is recognized as admin
SELECT 
    auth.uid() as current_user_id,
    public.is_admin_user() as is_admin,
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()) as current_role,
    (SELECT email FROM public.profiles WHERE id = auth.uid()) as current_email;

-- =============================================================================
-- STEP 5: Verify data access
-- =============================================================================

-- Test access to critical tables
SELECT 'Halls Access Test' as test_name, COUNT(*) as accessible_records FROM public.halls;
SELECT 'Bookings Access Test' as test_name, COUNT(*) as accessible_records FROM public.bookings;
SELECT 'Students Access Test' as test_name, COUNT(*) as accessible_records FROM public.students;
SELECT 'Payments Access Test' as test_name, COUNT(*) as accessible_records FROM public.payment_records;

-- =============================================================================
-- STEP 6: Optional - Add protection trigger for admin role
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

-- =============================================================================
-- Final verification message
-- =============================================================================

SELECT 
    'Admin access fix completed!' as message,
    'Please refresh your application to see the changes' as action;