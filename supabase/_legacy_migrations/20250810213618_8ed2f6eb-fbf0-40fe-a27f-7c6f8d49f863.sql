-- Add teacher role to user_role enum (separate transaction)
ALTER TYPE user_role ADD VALUE 'teacher';

-- Add username field to profiles for teacher login
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Add teacher_id field to profiles to link with teachers table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL;

-- Add is_custom_fee column to bookings if not exists
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_custom_fee boolean DEFAULT false;

-- Add default_class_fee column to teachers if not exists  
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS default_class_fee numeric DEFAULT 0;