-- Add parent_phone field to students table if not exists
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS parent_phone TEXT;