-- First, let's check if the current user has admin privileges in the update function
-- This will help us fix the role change blocking issue

-- Update the guard_profile_role_changes function to allow edge function calls
CREATE OR REPLACE FUNCTION public.guard_profile_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow all changes if called from a SECURITY DEFINER context (edge functions)
  -- This can be detected by checking if the current user is the service role
  IF session_user = 'postgres' OR current_user = 'service_role' OR current_user = 'supabase_admin' THEN
    -- Skip all checks when called from admin functions or service role
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

      -- Audit log of role changes
      INSERT INTO public.audit_logs (actor_user_id, action, details)
      VALUES (
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'),
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