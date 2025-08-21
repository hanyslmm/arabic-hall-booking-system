-- Migration to unify user role system
-- This migration performs the following actions:
-- 1. Modify the user_role enum to include 'read_only' role
-- 2. Ensure all existing users have a non-null user_role
-- 3. Drop the existing role column from the profiles table

-- Step 1: Add 'read_only' to the user_role enum
-- First, we need to add the new enum value
ALTER TYPE user_role ADD VALUE 'read_only';

-- Step 2: Ensure all existing users have a non-null user_role
-- Set default user_role for any users that have null values
-- We'll use 'space_manager' as the default for existing null values
UPDATE public.profiles 
SET user_role = 'space_manager' 
WHERE user_role IS NULL;

-- For users who currently have 'ADMIN' in the role column but no user_role,
-- we'll set them to 'owner' to maintain their privileges
UPDATE public.profiles 
SET user_role = 'owner' 
WHERE role = 'ADMIN' AND user_role = 'space_manager';

-- Step 3: Drop the existing role column from the profiles table
-- First, we need to update any policies or functions that reference the old role column
-- This is a critical step to avoid breaking the application

-- Update RLS policies that reference the old role column
-- We'll replace references to p.role = 'ADMIN' with p.user_role = 'owner'

-- Update subjects table policies
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
CREATE POLICY "Owners and managers can manage subjects" 
ON public.subjects 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() 
  AND p.user_role IN ('owner', 'manager')
));

-- Update bookings policies (if they exist and reference the old role)
DO $$
BEGIN
  -- Check if the policy exists before dropping it
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bookings' 
    AND policyname = 'Admins and managers can manage all bookings'
  ) THEN
    DROP POLICY "Admins and managers can manage all bookings" ON public.bookings;
    CREATE POLICY "Owners and managers can manage all bookings" 
    ON public.bookings 
    FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.user_role IN ('owner', 'manager')
    ));
  END IF;
END $$;

-- Update teachers policies (if they exist and reference the old role)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'teachers' 
    AND policyname = 'Admins and managers can manage teachers'
  ) THEN
    DROP POLICY "Admins and managers can manage teachers" ON public.teachers;
    CREATE POLICY "Owners and managers can manage teachers" 
    ON public.teachers 
    FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.user_role IN ('owner', 'manager')
    ));
  END IF;
END $$;

-- Update any other policies that might reference the old role column
-- Check for halls policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'halls' 
    AND policyname LIKE '%Admin%'
  ) THEN
    -- Update halls policies to use user_role instead of role
    DROP POLICY IF EXISTS "Admins can manage halls" ON public.halls;
    CREATE POLICY "Owners and managers can manage halls" 
    ON public.halls 
    FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.user_role IN ('owner', 'manager')
    ));
  END IF;
END $$;

-- Step 4: Now it's safe to drop the role column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Step 5: Add a constraint to ensure user_role is never null going forward
ALTER TABLE public.profiles ALTER COLUMN user_role SET NOT NULL;

-- Step 6: Update the default value for new users
ALTER TABLE public.profiles ALTER COLUMN user_role SET DEFAULT 'space_manager';

-- Add a comment to document the unified role system
COMMENT ON COLUMN public.profiles.user_role IS 'Unified user role system: owner (full admin), manager (can manage spaces), space_manager (can book spaces), read_only (view only)';