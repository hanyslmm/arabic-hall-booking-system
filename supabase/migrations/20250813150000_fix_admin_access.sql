-- Fix Admin Access and Data Visibility Issues
-- This migration ensures that admin users with 'owner' role can see all data

BEGIN;

-- =============================================================================
-- STEP 1: Update the is_admin_user function to properly check for admin roles
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
BEGIN
  -- Check if the current user has admin privileges
  -- Admin users are those with 'owner' or 'manager' roles
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_role IN ('owner', 'manager')
  );
END;
$$;

-- =============================================================================
-- STEP 2: Create a more comprehensive permission check function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.has_full_access()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
DECLARE
  user_role_value text;
BEGIN
  -- Get the user's role
  SELECT user_role INTO user_role_value
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Owner and manager have full access
  RETURN user_role_value IN ('owner', 'manager');
END;
$$;

-- =============================================================================
-- STEP 3: Update RLS policies for all tables to ensure admin access
-- =============================================================================

-- BOOKINGS TABLE
DROP POLICY IF EXISTS "All authenticated users can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can manage bookings" ON public.bookings;

CREATE POLICY "Users can view bookings"
ON public.bookings FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert bookings"
ON public.bookings FOR INSERT
WITH CHECK (has_full_access());

CREATE POLICY "Admins can update bookings"
ON public.bookings FOR UPDATE
USING (has_full_access())
WITH CHECK (has_full_access());

CREATE POLICY "Admins can delete bookings"
ON public.bookings FOR DELETE
USING (has_full_access());

-- STUDENTS TABLE
DROP POLICY IF EXISTS "All authenticated users can view students" ON public.students;
DROP POLICY IF EXISTS "Admins can manage students" ON public.students;

CREATE POLICY "Users can view students"
ON public.students FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert students"
ON public.students FOR INSERT
WITH CHECK (has_full_access());

CREATE POLICY "Admins can update students"
ON public.students FOR UPDATE
USING (has_full_access())
WITH CHECK (has_full_access());

CREATE POLICY "Admins can delete students"
ON public.students FOR DELETE
USING (has_full_access());

-- TEACHERS TABLE
DROP POLICY IF EXISTS "All authenticated users can view teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admins can manage teachers" ON public.teachers;

CREATE POLICY "Users can view teachers"
ON public.teachers FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert teachers"
ON public.teachers FOR INSERT
WITH CHECK (has_full_access());

CREATE POLICY "Admins can update teachers"
ON public.teachers FOR UPDATE
USING (has_full_access())
WITH CHECK (has_full_access());

CREATE POLICY "Admins can delete teachers"
ON public.teachers FOR DELETE
USING (has_full_access());

-- HALLS TABLE
DROP POLICY IF EXISTS "All authenticated users can view halls" ON public.halls;
DROP POLICY IF EXISTS "Admins can manage halls" ON public.halls;

CREATE POLICY "Users can view halls"
ON public.halls FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert halls"
ON public.halls FOR INSERT
WITH CHECK (has_full_access());

CREATE POLICY "Admins can update halls"
ON public.halls FOR UPDATE
USING (has_full_access())
WITH CHECK (has_full_access());

CREATE POLICY "Admins can delete halls"
ON public.halls FOR DELETE
USING (has_full_access());

-- SUBJECTS TABLE
DROP POLICY IF EXISTS "All authenticated users can view subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;

CREATE POLICY "Users can view subjects"
ON public.subjects FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert subjects"
ON public.subjects FOR INSERT
WITH CHECK (has_full_access());

CREATE POLICY "Admins can update subjects"
ON public.subjects FOR UPDATE
USING (has_full_access())
WITH CHECK (has_full_access());

CREATE POLICY "Admins can delete subjects"
ON public.subjects FOR DELETE
USING (has_full_access());

-- ACADEMIC_STAGES TABLE
DROP POLICY IF EXISTS "All authenticated users can view academic stages" ON public.academic_stages;
DROP POLICY IF EXISTS "Admins can manage academic stages" ON public.academic_stages;

CREATE POLICY "Users can view academic stages"
ON public.academic_stages FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert academic stages"
ON public.academic_stages FOR INSERT
WITH CHECK (has_full_access());

CREATE POLICY "Admins can update academic stages"
ON public.academic_stages FOR UPDATE
USING (has_full_access())
WITH CHECK (has_full_access());

CREATE POLICY "Admins can delete academic stages"
ON public.academic_stages FOR DELETE
USING (has_full_access());

-- STUDENT_REGISTRATIONS TABLE
DROP POLICY IF EXISTS "All authenticated users can view student registrations" ON public.student_registrations;
DROP POLICY IF EXISTS "Admins can manage student registrations" ON public.student_registrations;

CREATE POLICY "Users can view student registrations"
ON public.student_registrations FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert student registrations"
ON public.student_registrations FOR INSERT
WITH CHECK (has_full_access());

CREATE POLICY "Admins can update student registrations"
ON public.student_registrations FOR UPDATE
USING (has_full_access())
WITH CHECK (has_full_access());

CREATE POLICY "Admins can delete student registrations"
ON public.student_registrations FOR DELETE
USING (has_full_access());

-- PAYMENTS TABLE
DROP POLICY IF EXISTS "All authenticated users can view payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;

CREATE POLICY "Users can view payments"
ON public.payments FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert payments"
ON public.payments FOR INSERT
WITH CHECK (has_full_access());

CREATE POLICY "Admins can update payments"
ON public.payments FOR UPDATE
USING (has_full_access())
WITH CHECK (has_full_access());

CREATE POLICY "Admins can delete payments"
ON public.payments FOR DELETE
USING (has_full_access());

-- ATTENDANCE TABLE
DROP POLICY IF EXISTS "All authenticated users can view attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can manage attendance" ON public.attendance;

CREATE POLICY "Users can view attendance"
ON public.attendance FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert attendance"
ON public.attendance FOR INSERT
WITH CHECK (has_full_access());

CREATE POLICY "Admins can update attendance"
ON public.attendance FOR UPDATE
USING (has_full_access())
WITH CHECK (has_full_access());

CREATE POLICY "Admins can delete attendance"
ON public.attendance FOR DELETE
USING (has_full_access());

-- =============================================================================
-- STEP 4: Ensure admin user has proper role
-- =============================================================================

-- Update any users who should be admin but don't have the correct role
-- This is a safety measure to ensure at least one admin exists
DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Count users with admin roles
  SELECT COUNT(*) INTO admin_count
  FROM public.profiles
  WHERE user_role IN ('owner', 'manager');
  
  -- If no admins exist, make the first user an owner
  IF admin_count = 0 THEN
    UPDATE public.profiles
    SET user_role = 'owner'
    WHERE id = (SELECT id FROM public.profiles ORDER BY created_at LIMIT 1);
    
    RAISE NOTICE 'No admin users found. First user has been promoted to owner.';
  END IF;
END $$;

-- =============================================================================
-- STEP 5: Add helpful comments
-- =============================================================================

COMMENT ON FUNCTION public.is_admin_user() IS 'Checks if the current user has admin privileges (owner or manager role)';
COMMENT ON FUNCTION public.has_full_access() IS 'Checks if the current user has full system access (owner or manager role)';
COMMENT ON FUNCTION public.can_read() IS 'Checks if the current user can read data (any authenticated user)';

COMMIT;