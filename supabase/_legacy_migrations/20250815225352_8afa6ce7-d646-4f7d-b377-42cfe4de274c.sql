-- Fix the admin_update_user_role function to properly handle all cases
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  target_user_id uuid, 
  new_user_role user_role, 
  new_full_name text DEFAULT NULL::text, 
  new_email text DEFAULT NULL::text, 
  new_phone text DEFAULT NULL::text, 
  new_teacher_id uuid DEFAULT NULL::uuid
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_profile profiles;
BEGIN
  -- Signal triggers to bypass role-change guard for this privileged operation
  PERFORM set_config('app.bypass_role_guard', 'on', true);

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
  
  -- Log the role change in audit logs (optional)
  INSERT INTO public.audit_logs (actor_user_id, action, details)
  VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000001'), -- fallback to service role
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
    -- Log error for debugging
    RAISE LOG 'Error in admin_update_user_role: %', SQLERRM;
    RAISE;
END;
$$;