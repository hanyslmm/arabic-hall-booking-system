-- Ensure admin account exists with proper credentials and highest privileges
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@system.local',
  crypt('Voda@123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = crypt('Voda@123', gen_salt('bf')),
  updated_at = NOW();

-- Ensure admin profile has highest privileges
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  user_role,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@system.local',
  'System Administrator',
  'ADMIN',
  'owner',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = 'ADMIN',
  user_role = 'owner',
  updated_at = NOW();

-- Update the admin authentication function to handle the correct password
CREATE OR REPLACE FUNCTION public.authenticate_admin(p_username text, p_password text)
RETURNS TABLE(user_id uuid, email text, full_name text, role text, user_role text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if credentials match admin account
  IF p_username = 'admin' AND p_password = 'Voda@123' THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.email,
      p.full_name,
      p.role::text,
      p.user_role::text
    FROM public.profiles p
    WHERE p.id = '00000000-0000-0000-0000-000000000001';
  END IF;
  
  RETURN;
END;
$$;