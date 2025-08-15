-- Fix the guard_profile_role_changes trigger to allow space_manager role updates
CREATE OR REPLACE FUNCTION public.guard_profile_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow privileged calls to bypass this guard (e.g., via admin_update_user_role)
  IF current_setting('app.bypass_role_guard', true) = 'on' THEN
    RETURN NEW;
  END IF;

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

      -- Allow all role changes from admin users - no restrictions on space_manager
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