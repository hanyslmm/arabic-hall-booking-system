-- Science Club - Fix User Roles and RLS Issues
-- This script diagnoses and fixes common user role and RLS permission issues

-- 1. Check current user profiles and their roles
SELECT 
    id,
    email,
    full_name,
    username,
    user_role,
    created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at;

-- 2. Check if there are users without profiles
SELECT 
    u.id,
    u.email,
    u.created_at,
    'Missing Profile' as issue
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 3. Check if there are profiles with NULL user_role
SELECT 
    id,
    email,
    full_name,
    user_role,
    'NULL user_role' as issue
FROM public.profiles
WHERE user_role IS NULL;

-- 4. Fix: Create profiles for users without them (set as 'owner' for immediate access)
INSERT INTO public.profiles (id, user_role, full_name, username)
SELECT 
    u.id,
    'owner'::user_role,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email),
    COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 5. Fix: Set user_role to 'owner' for profiles with NULL user_role
UPDATE public.profiles 
SET user_role = 'owner'::user_role
WHERE user_role IS NULL;

-- 6. Test RLS functions
SELECT 
    'can_read function test' as test,
    public.can_read() as result;

SELECT 
    'is_admin_user function test' as test,
    public.is_admin_user() as result;

-- 7. Test bookings table access
SELECT 
    'bookings access test' as test,
    COUNT(*) as booking_count
FROM public.bookings;

-- 8. Show final user states
SELECT 
    u.id,
    u.email,
    p.full_name,
    p.user_role,
    CASE 
        WHEN p.user_role IN ('owner', 'manager') THEN 'Full Admin Access'
        WHEN p.user_role IN ('space_manager', 'read_only') THEN 'Read Only Access'
        ELSE 'Unknown Access Level'
    END as access_level
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at;

-- 9. Quick fix: If you want to make all existing users owners (for immediate access)
-- Uncomment the following line if needed:
-- UPDATE public.profiles SET user_role = 'owner'::user_role WHERE user_role != 'owner';