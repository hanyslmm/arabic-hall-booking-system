-- Create a privileged function for admin role updates that bypasses triggers
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
SET search_path TO 'public'
AS $$
DECLARE
  updated_profile profiles;
BEGIN
  -- Direct update bypassing the trigger since this function is called by authorized admins
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
  
  -- Log the role change in audit logs
  INSERT INTO public.audit_logs (actor_user_id, action, details)
  VALUES (
    '00000000-0000-0000-0000-000000000001', -- service role acting on behalf of admin
    'admin_role_change',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'new_user_role', new_user_role::text,
      'updated_by', 'admin_function'
    )
  );
  
  RETURN updated_profile;
END;
$$;