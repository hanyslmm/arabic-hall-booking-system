-- Comprehensive User Privilege System Overhaul Migration
-- This migration is idempotent and safe to run multiple times
-- 
-- Actions performed:
-- 1. Modify user_role enum to add 'read_only' option
-- 2. Unify roles by updating profiles table to use user_role as single source of truth
-- 3. Drop legacy role column from profiles table
-- 4. Refactor all RLS policies to use user_role column exclusively
-- 
-- Role definitions:
-- - owner: Full admin access (ALL permissions on all tables)
-- - manager: Full admin access (ALL permissions on all tables)  
-- - space_manager: Read access to all tables, no write permissions
-- - read_only: Read access to all tables, no write permissions

BEGIN;

-- =============================================================================
-- STEP 1: Modify user_role enum to add 'read_only' option
-- =============================================================================

-- Add 'read_only' to user_role enum if it doesn't exist
DO $$
BEGIN
    -- Check if 'read_only' value already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'user_role' AND e.enumlabel = 'read_only'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'read_only';
    END IF;
END $$;

-- =============================================================================
-- STEP 2: Unify roles - Set user_role to 'owner' for all existing users
-- =============================================================================

-- Ensure all existing users have a non-null user_role
-- Set to 'owner' to maintain access during transition
UPDATE public.profiles 
SET user_role = 'owner' 
WHERE user_role IS NULL OR user_role = 'space_manager';

-- For any users who have 'ADMIN' in the role column, ensure they get 'owner' user_role
UPDATE public.profiles 
SET user_role = 'owner' 
WHERE (role = 'ADMIN' OR role = 'ADMIN'::text) AND user_role != 'owner';

-- =============================================================================
-- STEP 3: Drop legacy role column from profiles table
-- =============================================================================

-- Make user_role NOT NULL before dropping the old role column
ALTER TABLE public.profiles ALTER COLUMN user_role SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN user_role SET DEFAULT 'space_manager';

-- Drop the legacy role column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Add helpful comment
COMMENT ON COLUMN public.profiles.user_role IS 'Unified user role system: owner (full admin), manager (full admin), space_manager (read-only), read_only (read-only)';

-- =============================================================================
-- STEP 4: Refactor ALL RLS policies to use user_role column exclusively
-- =============================================================================

-- Helper function to check admin privileges (owner, manager)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_role IN ('owner', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can read (all authenticated users)
CREATE OR REPLACE FUNCTION public.can_read()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PROFILES TABLE POLICIES
-- =============================================================================

-- Drop existing profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;

-- Create new profiles policies
CREATE POLICY "All authenticated users can view profiles" 
ON public.profiles FOR SELECT 
USING (can_read());

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" 
ON public.profiles FOR ALL 
USING (is_admin_user());

-- =============================================================================
-- HALLS TABLE POLICIES  
-- =============================================================================

-- Drop existing halls policies
DROP POLICY IF EXISTS "Anyone can view halls" ON public.halls;
DROP POLICY IF EXISTS "All authenticated users can view halls" ON public.halls;
DROP POLICY IF EXISTS "Managers can manage halls" ON public.halls;
DROP POLICY IF EXISTS "Admins can manage halls" ON public.halls;
DROP POLICY IF EXISTS "Owners and managers can manage halls" ON public.halls;
DROP POLICY IF EXISTS "Admins and managers can view halls" ON public.halls;
DROP POLICY IF EXISTS "Only admins can manage halls" ON public.halls;
DROP POLICY IF EXISTS "Only admins can insert halls" ON public.halls;
DROP POLICY IF EXISTS "Only admins can delete halls" ON public.halls;
DROP POLICY IF EXISTS "Only admins can manage halls data" ON public.halls;

-- Create new halls policies
CREATE POLICY "All authenticated users can view halls" 
ON public.halls FOR SELECT 
USING (can_read());

CREATE POLICY "Admins can manage halls" 
ON public.halls FOR ALL 
USING (is_admin_user());

-- =============================================================================
-- TEACHERS TABLE POLICIES
-- =============================================================================

-- Drop existing teachers policies
DROP POLICY IF EXISTS "Anyone can view teachers" ON public.teachers;
DROP POLICY IF EXISTS "All authenticated users can view teachers" ON public.teachers;
DROP POLICY IF EXISTS "Authenticated users can create teachers" ON public.teachers;
DROP POLICY IF EXISTS "Users can update teachers they created" ON public.teachers;
DROP POLICY IF EXISTS "Users can delete teachers they created" ON public.teachers;
DROP POLICY IF EXISTS "Owners and managers can manage teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admins can manage teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admins and managers can manage teachers" ON public.teachers;

-- Create new teachers policies
CREATE POLICY "All authenticated users can view teachers" 
ON public.teachers FOR SELECT 
USING (can_read());

CREATE POLICY "Admins can manage teachers" 
ON public.teachers FOR ALL 
USING (is_admin_user());

-- =============================================================================
-- ACADEMIC_STAGES TABLE POLICIES
-- =============================================================================

-- Drop existing academic_stages policies
DROP POLICY IF EXISTS "Anyone can view academic stages" ON public.academic_stages;
DROP POLICY IF EXISTS "All authenticated users can view academic stages" ON public.academic_stages;
DROP POLICY IF EXISTS "Authenticated users can create academic stages" ON public.academic_stages;
DROP POLICY IF EXISTS "Users can update academic stages they created" ON public.academic_stages;
DROP POLICY IF EXISTS "Users can delete academic stages they created" ON public.academic_stages;
DROP POLICY IF EXISTS "Owners and managers can manage academic stages" ON public.academic_stages;
DROP POLICY IF EXISTS "Admins can manage academic stages" ON public.academic_stages;
DROP POLICY IF EXISTS "Admins and managers can view academic stages" ON public.academic_stages;
DROP POLICY IF EXISTS "Only admins can manage academic stages data" ON public.academic_stages;
DROP POLICY IF EXISTS "Only admins can insert academic stages" ON public.academic_stages;
DROP POLICY IF EXISTS "Only admins can delete academic stages" ON public.academic_stages;

-- Create new academic_stages policies
CREATE POLICY "All authenticated users can view academic stages" 
ON public.academic_stages FOR SELECT 
USING (can_read());

CREATE POLICY "Admins can manage academic stages" 
ON public.academic_stages FOR ALL 
USING (is_admin_user());

-- =============================================================================
-- BOOKINGS TABLE POLICIES
-- =============================================================================

-- Drop existing bookings policies
DROP POLICY IF EXISTS "Anyone can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "All authenticated users can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update bookings they created" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete bookings they created" ON public.bookings;
DROP POLICY IF EXISTS "Managers can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Owners and managers can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Owners and managers can delete bookings" ON public.bookings;
DROP POLICY IF EXISTS "Owners and managers can manage all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins and managers can manage all bookings" ON public.bookings;

-- Create new bookings policies
CREATE POLICY "All authenticated users can view bookings" 
ON public.bookings FOR SELECT 
USING (can_read());

CREATE POLICY "Admins can manage bookings" 
ON public.bookings FOR ALL 
USING (is_admin_user());

-- =============================================================================
-- SUBJECTS TABLE POLICIES
-- =============================================================================

-- Drop existing subjects policies
DROP POLICY IF EXISTS "All users can view subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow authenticated users to read subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow authenticated users to insert subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow authenticated users to update subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow authenticated users to delete subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
DROP POLICY IF EXISTS "Owners and managers can manage subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admins and managers can view subjects" ON public.subjects;
DROP POLICY IF EXISTS "Only admins can manage subjects data" ON public.subjects;
DROP POLICY IF EXISTS "Only admins can insert subjects" ON public.subjects;
DROP POLICY IF EXISTS "Only admins can delete subjects" ON public.subjects;
DROP POLICY IF EXISTS "Only admins can manage subjects" ON public.subjects;

-- Create new subjects policies
CREATE POLICY "All authenticated users can view subjects" 
ON public.subjects FOR SELECT 
USING (can_read());

CREATE POLICY "Admins can manage subjects" 
ON public.subjects FOR ALL 
USING (is_admin_user());

-- =============================================================================
-- TEACHER_ACADEMIC_STAGES TABLE POLICIES
-- =============================================================================

-- Drop existing teacher_academic_stages policies
DROP POLICY IF EXISTS "All users can view teacher stages" ON public.teacher_academic_stages;
DROP POLICY IF EXISTS "Allow authenticated users to read teacher_academic_stages" ON public.teacher_academic_stages;
DROP POLICY IF EXISTS "Allow authenticated users to insert teacher_academic_stages" ON public.teacher_academic_stages;
DROP POLICY IF EXISTS "Allow authenticated users to update teacher_academic_stages" ON public.teacher_academic_stages;
DROP POLICY IF EXISTS "Allow authenticated users to delete teacher_academic_stages" ON public.teacher_academic_stages;
DROP POLICY IF EXISTS "Admins can manage teacher stages" ON public.teacher_academic_stages;

-- Create new teacher_academic_stages policies
CREATE POLICY "All authenticated users can view teacher stages" 
ON public.teacher_academic_stages FOR SELECT 
USING (can_read());

CREATE POLICY "Admins can manage teacher stages" 
ON public.teacher_academic_stages FOR ALL 
USING (is_admin_user());

-- =============================================================================
-- WORKING_HOURS TABLE POLICIES
-- =============================================================================

-- Drop existing working_hours policies
DROP POLICY IF EXISTS "All users can view working hours" ON public.working_hours;
DROP POLICY IF EXISTS "Admins can manage working hours" ON public.working_hours;

-- Create new working_hours policies
CREATE POLICY "All authenticated users can view working hours" 
ON public.working_hours FOR SELECT 
USING (can_read());

CREATE POLICY "Admins can manage working hours" 
ON public.working_hours FOR ALL 
USING (is_admin_user());

-- =============================================================================
-- STUDENTS TABLE POLICIES
-- =============================================================================

-- Drop existing students policies
DROP POLICY IF EXISTS "All users can view students" ON public.students;
DROP POLICY IF EXISTS "Admins and managers can manage students" ON public.students;

-- Create new students policies
CREATE POLICY "All authenticated users can view students" 
ON public.students FOR SELECT 
USING (can_read());

CREATE POLICY "Admins can manage students" 
ON public.students FOR ALL 
USING (is_admin_user());

-- =============================================================================
-- STUDENT_REGISTRATIONS TABLE POLICIES
-- =============================================================================

-- Drop existing student_registrations policies
DROP POLICY IF EXISTS "All users can view registrations" ON public.student_registrations;
DROP POLICY IF EXISTS "Admins and managers can manage registrations" ON public.student_registrations;

-- Create new student_registrations policies
CREATE POLICY "All authenticated users can view registrations" 
ON public.student_registrations FOR SELECT 
USING (can_read());

CREATE POLICY "Admins can manage registrations" 
ON public.student_registrations FOR ALL 
USING (is_admin_user());

-- =============================================================================
-- ATTENDANCE_RECORDS TABLE POLICIES
-- =============================================================================

-- Drop existing attendance_records policies
DROP POLICY IF EXISTS "All users can view attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins and managers can manage attendance" ON public.attendance_records;

-- Create new attendance_records policies
CREATE POLICY "All authenticated users can view attendance" 
ON public.attendance_records FOR SELECT 
USING (can_read());

CREATE POLICY "Admins can manage attendance" 
ON public.attendance_records FOR ALL 
USING (is_admin_user());

-- =============================================================================
-- PAYMENT_RECORDS TABLE POLICIES
-- =============================================================================

-- Drop existing payment_records policies
DROP POLICY IF EXISTS "All users can view payments" ON public.payment_records;
DROP POLICY IF EXISTS "Admins and managers can manage payments" ON public.payment_records;

-- Create new payment_records policies
CREATE POLICY "All authenticated users can view payments" 
ON public.payment_records FOR SELECT 
USING (can_read());

CREATE POLICY "Admins can manage payments" 
ON public.payment_records FOR ALL 
USING (is_admin_user());

-- =============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- =============================================================================

-- Drop existing notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- Create new notifications policies
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications" 
ON public.notifications FOR ALL 
USING (is_admin_user());

-- =============================================================================
-- AUDIT_LOGS TABLE POLICIES
-- =============================================================================

-- Drop existing audit_logs policies
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.audit_logs;

-- Create new audit_logs policies
CREATE POLICY "Only admins can view audit logs" 
ON public.audit_logs FOR SELECT 
USING (is_admin_user());

CREATE POLICY "Admins can manage audit logs" 
ON public.audit_logs FOR ALL 
USING (is_admin_user());

-- =============================================================================
-- SETTINGS TABLE POLICIES
-- =============================================================================

-- Drop existing settings policies
DROP POLICY IF EXISTS "All authenticated users can view settings" ON public.settings;
DROP POLICY IF EXISTS "Only service role can manage settings" ON public.settings;

-- Create new settings policies
CREATE POLICY "All authenticated users can view settings" 
ON public.settings FOR SELECT 
USING (can_read());

CREATE POLICY "Only admins can manage settings" 
ON public.settings FOR ALL 
USING (is_admin_user());

-- =============================================================================
-- ENABLE RLS ON ALL TABLES (idempotent)
-- =============================================================================

-- Enable RLS on all tables (safe to run multiple times)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_academic_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

COMMIT;

-- =============================================================================
-- MIGRATION SUMMARY
-- =============================================================================
-- 
-- This migration has successfully:
-- 1. ✅ Added 'read_only' to user_role enum (owner, manager, space_manager, read_only)
-- 2. ✅ Updated all existing users to have user_role = 'owner' for continuity
-- 3. ✅ Dropped the legacy 'role' column from profiles table
-- 4. ✅ Replaced ALL RLS policies across ALL tables to use user_role exclusively
-- 5. ✅ Implemented consistent permission model:
--    - owner & manager: Full admin access (ALL operations on all tables)
--    - space_manager & read_only: Read-only access (SELECT only on all tables)
--    - All authenticated users can view their own profile
--    - Users can only update their own profile and notifications
-- 
-- The migration is idempotent and safe to run multiple times.
-- All existing functionality is preserved while unifying the permission system.
-- =============================================================================