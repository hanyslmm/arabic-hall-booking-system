-- Restore read access for authenticated users and keep admin management
-- This migration reverts the incorrect admin-only read policies introduced earlier
-- and reinstates the stable policies based on can_read() and is_admin_user().

-- HALLS
DROP POLICY IF EXISTS "Allow read access for admins" ON public.halls;
DROP POLICY IF EXISTS "All authenticated users can view halls" ON public.halls;
DROP POLICY IF EXISTS "Admins can manage halls" ON public.halls;
CREATE POLICY "All authenticated users can view halls"
ON public.halls FOR SELECT
USING (can_read());
CREATE POLICY "Admins can manage halls"
ON public.halls FOR ALL
USING (is_admin_user());

-- STUDENTS
DROP POLICY IF EXISTS "Allow read access for admins" ON public.students;
DROP POLICY IF EXISTS "All authenticated users can view students" ON public.students;
DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
CREATE POLICY "All authenticated users can view students"
ON public.students FOR SELECT
USING (can_read());
CREATE POLICY "Admins can manage students"
ON public.students FOR ALL
USING (is_admin_user());

-- TEACHERS
DROP POLICY IF EXISTS "Allow read access for admins" ON public.teachers;
DROP POLICY IF EXISTS "All authenticated users can view teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admins can manage teachers" ON public.teachers;
CREATE POLICY "All authenticated users can view teachers"
ON public.teachers FOR SELECT
USING (can_read());
CREATE POLICY "Admins can manage teachers"
ON public.teachers FOR ALL
USING (is_admin_user());

-- BOOKINGS
DROP POLICY IF EXISTS "Allow read access for admins" ON public.bookings;
DROP POLICY IF EXISTS "All authenticated users can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can manage bookings" ON public.bookings;
CREATE POLICY "All authenticated users can view bookings"
ON public.bookings FOR SELECT
USING (can_read());
CREATE POLICY "Admins can manage bookings"
ON public.bookings FOR ALL
USING (is_admin_user());

-- SUBJECTS
DROP POLICY IF EXISTS "Allow read access for admins" ON public.subjects;
DROP POLICY IF EXISTS "All authenticated users can view subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
CREATE POLICY "All authenticated users can view subjects"
ON public.subjects FOR SELECT
USING (can_read());
CREATE POLICY "Admins can manage subjects"
ON public.subjects FOR ALL
USING (is_admin_user());

-- (Optional) Other reference tables that should remain readable by authenticated users
-- Uncomment if needed in your project
-- DROP POLICY IF EXISTS "All authenticated users can view working hours" ON public.working_hours;
-- CREATE POLICY "All authenticated users can view working hours" ON public.working_hours FOR SELECT USING (can_read());

-- Notes:
-- - Functions can_read() and is_admin_user() are defined in an earlier migration
--   (20250120000000_comprehensive_user_privilege_overhaul.sql)
-- - This migration is idempotent with DROP POLICY IF EXISTS safeguards