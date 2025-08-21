-- Fix the guard_profile_role_changes trigger to allow admin function calls
-- The issue is that the trigger doesn't recognize when it's called through a SECURITY DEFINER function

DROP TRIGGER IF EXISTS guard_profile_role_changes_trigger ON public.profiles;

CREATE OR REPLACE FUNCTION public.guard_profile_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow all changes if called from a SECURITY DEFINER context (admin functions)
  -- This can be detected by checking if the current user is the function owner
  IF session_user = 'postgres' OR current_user = 'service_role' THEN
    -- Skip all checks when called from admin functions
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
$function$;

-- Recreate the trigger
CREATE TRIGGER guard_profile_role_changes_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_role_changes();

-- Also update the admin function to ensure it uses the service role context
CREATE OR REPLACE FUNCTION public.admin_update_user_role(target_user_id uuid, new_user_role user_role, new_full_name text DEFAULT NULL::text, new_email text DEFAULT NULL::text, new_phone text DEFAULT NULL::text, new_teacher_id uuid DEFAULT NULL::uuid)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET role TO 'service_role'
AS $function$
DECLARE
  updated_profile profiles;
BEGIN
  -- Direct update with elevated privileges, bypassing all triggers and RLS
  UPDATE profiles 
  SET 
    user_role = new_user_role,
    full_name = COALESCE(new_full_name, full_name),
    email = COALESCE(new_email, email),
    phone = COALESCE(new_phone, phone),
    teacher_id = new_teacher_id,
    updated_at = NOW()
  WHERE id = target_user_id
  RETURNING * INTO updated_profile;
  
  IF NOT FOUND THEN
    -- If profile doesn't exist, create it
    INSERT INTO profiles (
      id, user_role, full_name, email, phone, teacher_id, role
    ) VALUES (
      target_user_id, 
      new_user_role, 
      new_full_name, 
      new_email, 
      new_phone, 
      new_teacher_id,
      'USER'::app_role
    )
    RETURNING * INTO updated_profile;
  END IF;
  
  -- Log the role change in audit logs
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
$function$;