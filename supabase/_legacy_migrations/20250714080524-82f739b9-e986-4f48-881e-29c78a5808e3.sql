-- Create admin users in auth.users if they don't exist
-- This will allow login with admin/Voda@123 and hanyslmm@gmail.com/Elco@2012

-- First, ensure the admin@system.local user exists for the 'admin' username login
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  email_change_token_new,
  email_change_token_current,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@system.local',
  crypt('Voda@123', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "System Administrator"}'
) ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('Voda@123', gen_salt('bf')),
  updated_at = now();

-- Ensure the hanyslmm@gmail.com user exists
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  email_change_token_new,
  email_change_token_current,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  '358d25c8-52fe-4ecf-abd6-b812ac0ac691',
  '00000000-0000-0000-0000-000000000000',
  'hanyslmm@gmail.com',
  crypt('Elco@2012', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "System Administrator"}'
) ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('Elco@2012', gen_salt('bf')),
  updated_at = now();

-- Ensure profiles exist for both users
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
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  email = 'admin@system.local',
  full_name = 'System Administrator',
  role = 'ADMIN',
  user_role = 'owner',
  updated_at = now();

-- Update the existing hanyslmm@gmail.com profile
UPDATE public.profiles SET
  email = 'hanyslmm@gmail.com',
  full_name = 'System Administrator',
  role = 'ADMIN',
  user_role = 'owner',
  updated_at = now()
WHERE id = '358d25c8-52fe-4ecf-abd6-b812ac0ac691';