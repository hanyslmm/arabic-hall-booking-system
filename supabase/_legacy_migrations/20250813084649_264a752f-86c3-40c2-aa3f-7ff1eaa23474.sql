-- Emergency restore of admin privileges for known admin accounts
-- This directly updates profiles to recover access after security hardening

-- 1) Promote by email (common admin accounts)
UPDATE public.profiles
SET user_role = 'owner'::user_role,
    role = 'ADMIN'::app_role,
    updated_at = now()
WHERE email IN (
  'admin@admin.com',
  'hanyslmm@gmail.com',
  'admin@system.local'
);

-- 2) Additionally promote by specific known user ids (from logs)
UPDATE public.profiles
SET user_role = 'owner'::user_role,
    role = 'ADMIN'::app_role,
    updated_at = now()
WHERE id IN (
  '00000000-0000-0000-0000-000000000001'
);
