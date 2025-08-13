-- Fix Admin User Role Script
-- This script ensures the admin user has the correct 'owner' role
-- Run this script in Supabase SQL Editor to fix admin access issues

-- First, let's check the current state of users
SELECT 
  id, 
  email, 
  full_name, 
  user_role,
  created_at
FROM public.profiles
ORDER BY created_at;

-- Update the admin user to have 'owner' role
-- Replace 'admin@example.com' with your actual admin email
UPDATE public.profiles
SET user_role = 'owner'
WHERE email = 'admin@example.com' 
  OR email LIKE '%admin%'
  OR id IN (
    SELECT id 
    FROM public.profiles 
    ORDER BY created_at 
    LIMIT 1
  );

-- Verify the update
SELECT 
  id, 
  email, 
  full_name, 
  user_role,
  'Should be owner' as expected_role
FROM public.profiles
WHERE user_role = 'owner';

-- Check if the functions exist and work correctly
SELECT 
  auth.uid() as current_user_id,
  is_admin_user() as is_admin,
  can_read() as can_read,
  has_full_access() as has_full_access;

-- List all RLS policies to ensure they're correctly set
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('bookings', 'students', 'teachers', 'halls', 'subjects', 'academic_stages')
ORDER BY tablename, policyname;