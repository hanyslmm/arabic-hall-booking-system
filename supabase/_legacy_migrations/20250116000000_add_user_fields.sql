-- Add phone and username columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS username TEXT;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Update existing profiles to have username based on email prefix where possible
UPDATE public.profiles 
SET username = CASE 
  WHEN email LIKE '%@local.app' THEN REPLACE(email, '@local.app', '')
  WHEN email IS NOT NULL THEN SPLIT_PART(email, '@', 1)
  ELSE NULL
END
WHERE username IS NULL AND email IS NOT NULL;