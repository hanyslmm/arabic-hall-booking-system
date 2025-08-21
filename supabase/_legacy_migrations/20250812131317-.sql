-- Phase 1: Critical security fixes

-- 1) Tighten profiles access and prevent privilege escalation
-- Drop overly permissive profiles SELECT policy
DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON public.profiles;

-- Allow users to view only their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow admins (owner/manager or legacy ADMIN) to view any profile
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'ADMIN'::app_role OR p.user_role IN ('owner'::user_role, 'manager'::user_role))
  )
);

-- Allow admins to update any profile (in addition to existing self-update policy)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'ADMIN'::app_role OR p.user_role IN ('owner'::user_role, 'manager'::user_role))
  )
);

-- Guard function to prevent non-admins from changing role/user_role
CREATE OR REPLACE FUNCTION public.guard_profile_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.role, 'USER'::app_role) IS DISTINCT FROM OLD.role
       OR COALESCE(NEW.user_role, 'space_manager'::user_role) IS DISTINCT FROM OLD.user_role THEN

      -- Only admins/owners/managers may change these privileged columns
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role = 'ADMIN'::app_role OR p.user_role IN ('owner'::user_role, 'manager'::user_role))
      ) THEN
        RAISE EXCEPTION 'Unauthorized role change for profile %', NEW.id;
      END IF;

      -- Optional audit log of role changes
      INSERT INTO public.audit_logs (actor_user_id, action, details)
      VALUES (
        auth.uid(),
        'profile_role_change',
        jsonb_build_object(
          'target_user_id', NEW.id,
          'old_role', OLD.role::text,
          'new_role', NEW.role::text,
          'old_user_role', OLD.user_role::text,
          'new_user_role', NEW.user_role::text
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_role_changes ON public.profiles;
CREATE TRIGGER trg_guard_profile_role_changes
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_role_changes();

-- 2) Remove insecure admin backdoor function
DROP FUNCTION IF EXISTS public.authenticate_admin(text, text);

-- 3) Tighten execution of SECURITY DEFINER functions
-- Revoke public execution and grant to authenticated role only
REVOKE ALL ON FUNCTION public.apply_teacher_default_fee(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_teacher_default_fee(uuid, numeric) TO authenticated;

REVOKE ALL ON FUNCTION public.set_booking_custom_fee(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_booking_custom_fee(uuid, numeric) TO authenticated;

REVOKE ALL ON FUNCTION public.apply_booking_fee(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_booking_fee(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_teacher_statistics(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_teacher_statistics(uuid) TO authenticated;

-- Ensure a safe search_path on security definer functions that missed it
ALTER FUNCTION public.log_booking_creation() SET search_path = 'public';


-- Phase 2: Reduce data exposure (least privilege)
-- Students: remove global SELECT and add targeted policies
DROP POLICY IF EXISTS "All users can view students" ON public.students;

CREATE POLICY "Admins can view all students"
ON public.students
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'ADMIN'::app_role OR p.user_role IN ('owner'::user_role, 'manager'::user_role))
  )
);

-- Teachers can view only students registered to their classes
CREATE POLICY "Teachers can view their students"
ON public.students
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.student_registrations sr
    JOIN public.bookings b ON b.id = sr.booking_id
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE sr.student_id = students.id
      AND p.user_role = 'teacher'::user_role
      AND p.teacher_id = b.teacher_id
  )
);

-- Student registrations: remove global SELECT (admins still covered by existing ALL policy)
DROP POLICY IF EXISTS "All users can view registrations" ON public.student_registrations;

-- Payment records: remove global SELECT (admins covered by existing ALL policy)
DROP POLICY IF EXISTS "All users can view payments" ON public.payment_records;

-- Bookings: remove global INSERT; admins/managers already have ALL
DROP POLICY IF EXISTS "All users can create bookings" ON public.bookings;
