-- Role assignment hardening and policy corrections
BEGIN;

-- 1) Privileged admin update function with trigger bypass flag
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  target_user_id uuid,
  new_user_role user_role,
  new_full_name text DEFAULT NULL,
  new_email text DEFAULT NULL,
  new_phone text DEFAULT NULL,
  new_teacher_id uuid DEFAULT NULL
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  updated_profile profiles;
BEGIN
  -- Signal triggers to bypass role-change guard for this privileged operation
  PERFORM set_config('app.bypass_role_guard', 'on', true);

  UPDATE public.profiles
  SET
    user_role = new_user_role,
    full_name = COALESCE(new_full_name, full_name),
    email = COALESCE(new_email, email),
    phone = COALESCE(new_phone, phone),
    teacher_id = new_teacher_id,
    updated_at = now()
  WHERE id = target_user_id
  RETURNING * INTO updated_profile;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, user_role, full_name, email, phone, teacher_id, role)
    VALUES (target_user_id, new_user_role, new_full_name, new_email, new_phone, new_teacher_id, 'USER'::app_role)
    RETURNING * INTO updated_profile;
  END IF;

  INSERT INTO public.audit_logs (actor_user_id, action, details)
  VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000001'),
    'admin_role_change',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'new_user_role', new_user_role::text,
      'updated_by', 'admin_function'
    )
  );

  RETURN updated_profile;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in admin_update_user_role: %', SQLERRM;
    RAISE;
END;
$$;

-- 2) Guard trigger honors bypass flag and is re-created
CREATE OR REPLACE FUNCTION public.guard_profile_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Allow privileged calls to bypass this guard (e.g., via admin_update_user_role)
  IF current_setting('app.bypass_role_guard', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(NEW.role, 'USER'::app_role) IS DISTINCT FROM OLD.role
       OR COALESCE(NEW.user_role, 'space_manager'::user_role) IS DISTINCT FROM OLD.user_role THEN

      IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role = 'ADMIN'::app_role OR p.user_role IN ('owner'::user_role, 'manager'::user_role))
      ) THEN
        RAISE EXCEPTION 'Unauthorized role change for profile %', NEW.id;
      END IF;

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

-- 3) Remove unintended space_manager manage policies and tighten helper
DROP POLICY IF EXISTS "Space managers can manage students" ON public.students;
DROP POLICY IF EXISTS "Space managers can manage registrations" ON public.student_registrations;
DROP POLICY IF EXISTS "Space managers can manage bookings" ON public.bookings;
DROP POLICY IF EXISTS "Space managers can manage payments" ON public.payment_records;
DROP POLICY IF EXISTS "Space managers can manage attendance" ON public.attendance_records;

CREATE OR REPLACE FUNCTION public.can_manage_operations(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_id
      AND (p.role = 'ADMIN'::app_role OR p.user_role = ANY(ARRAY['owner'::user_role, 'manager'::user_role]))
  );
$$;

COMMIT;