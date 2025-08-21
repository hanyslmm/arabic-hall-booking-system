-- Consolidated admin privilege fix (final)
-- Ensures admins (owner/manager or legacy ADMIN) have full CRUD everywhere
-- Also fixes prior policy references to non-existent payments/attendance tables

BEGIN;

-- 1) Create/refresh unified admin-check helpers
CREATE OR REPLACE FUNCTION public.check_user_admin_status()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'ADMIN'::app_role OR p.user_role IN ('owner'::user_role, 'manager'::user_role))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT public.check_user_admin_status();
$$;

CREATE OR REPLACE FUNCTION public.has_full_access()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT public.check_user_admin_status();
$$;

GRANT EXECUTE ON FUNCTION public.check_user_admin_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_full_access() TO authenticated;

-- 2) Profiles RLS: own access + admin manage
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- 3) For each application table, ensure an admin-manage policy exists
-- Helper comment: we only DROP the specific admin-manage policy name we create below
-- to avoid clobbering other select policies intentionally

-- Bookings
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
CREATE POLICY "Admins can manage all bookings"
ON public.bookings
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Students
DROP POLICY IF EXISTS "Admins can manage all students" ON public.students;
CREATE POLICY "Admins can manage all students"
ON public.students
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Teachers
DROP POLICY IF EXISTS "Admins can manage all teachers" ON public.teachers;
CREATE POLICY "Admins can manage all teachers"
ON public.teachers
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Halls
DROP POLICY IF EXISTS "Admins can manage all halls" ON public.halls;
CREATE POLICY "Admins can manage all halls"
ON public.halls
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Subjects
DROP POLICY IF EXISTS "Admins can manage all subjects" ON public.subjects;
CREATE POLICY "Admins can manage all subjects"
ON public.subjects
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Academic stages
DROP POLICY IF EXISTS "Admins can manage all academic stages" ON public.academic_stages;
CREATE POLICY "Admins can manage all academic stages"
ON public.academic_stages
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Student registrations
DROP POLICY IF EXISTS "Admins can manage all registrations" ON public.student_registrations;
CREATE POLICY "Admins can manage all registrations"
ON public.student_registrations
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Payment records (correct table name)
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payment_records;
CREATE POLICY "Admins can manage all payments"
ON public.payment_records
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Attendance records (correct table name)
DROP POLICY IF EXISTS "Admins can manage all attendance" ON public.attendance_records;
CREATE POLICY "Admins can manage all attendance"
ON public.attendance_records
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Teacher <> stage junction
DROP POLICY IF EXISTS "Admins can manage all teacher stages" ON public.teacher_academic_stages;
CREATE POLICY "Admins can manage all teacher stages"
ON public.teacher_academic_stages
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Working hours
DROP POLICY IF EXISTS "Admins can manage all working hours" ON public.working_hours;
CREATE POLICY "Admins can manage all working hours"
ON public.working_hours
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Optional: settings/notifications/audit tables if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;';
    EXECUTE 'CREATE POLICY "Admins can manage all notifications" ON public.notifications FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_logs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all audit logs" ON public.audit_logs;';
    EXECUTE 'CREATE POLICY "Admins can manage all audit logs" ON public.audit_logs FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='settings') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all settings" ON public.settings;';
    EXECUTE 'CREATE POLICY "Admins can manage all settings" ON public.settings FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());';
  END IF;
END $$;

-- 4) Ensure at least one admin exists (safety)
UPDATE public.profiles
SET user_role = 'owner'::user_role,
    role = 'ADMIN'::app_role,
    full_name = COALESCE(full_name, 'System Administrator'),
    updated_at = now()
WHERE email IN ('admin@system.local', 'admin@admin.com')
   OR id = '00000000-0000-0000-0000-000000000001';

COMMIT;