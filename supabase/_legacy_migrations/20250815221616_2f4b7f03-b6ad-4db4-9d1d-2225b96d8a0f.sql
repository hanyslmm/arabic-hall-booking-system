-- Fix admin role assignment issue by removing restriction in update-user edge function
-- Update RLS policies to grant space_manager full permissions for daily operations

-- Students table: Allow space_manager to manage students  
DROP POLICY IF EXISTS "Space managers can manage students" ON public.students;
CREATE POLICY "Space managers can manage students" 
ON public.students 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.role = 'ADMIN'::app_role OR p.user_role = ANY(ARRAY['owner'::user_role, 'manager'::user_role, 'space_manager'::user_role]))
  )
);

-- Student registrations: Allow space_manager to manage registrations
DROP POLICY IF EXISTS "Space managers can manage registrations" ON public.student_registrations;
CREATE POLICY "Space managers can manage registrations" 
ON public.student_registrations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.role = 'ADMIN'::app_role OR p.user_role = ANY(ARRAY['owner'::user_role, 'manager'::user_role, 'space_manager'::user_role]))
  )
);

-- Bookings: Allow space_manager to manage bookings
DROP POLICY IF EXISTS "Space managers can manage bookings" ON public.bookings;
CREATE POLICY "Space managers can manage bookings" 
ON public.bookings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.role = 'ADMIN'::app_role OR p.user_role = ANY(ARRAY['owner'::user_role, 'manager'::user_role, 'space_manager'::user_role]))
  )
);

-- Payment records: Allow space_manager to manage payments
DROP POLICY IF EXISTS "Space managers can manage payments" ON public.payment_records;
CREATE POLICY "Space managers can manage payments" 
ON public.payment_records 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.role = 'ADMIN'::app_role OR p.user_role = ANY(ARRAY['owner'::user_role, 'manager'::user_role, 'space_manager'::user_role]))
  )
);

-- Attendance records: Allow space_manager to manage attendance
DROP POLICY IF EXISTS "Space managers can manage attendance" ON public.attendance_records;
CREATE POLICY "Space managers can manage attendance" 
ON public.attendance_records 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.role = 'ADMIN'::app_role OR p.user_role = ANY(ARRAY['owner'::user_role, 'manager'::user_role, 'space_manager'::user_role]))
  )
);

-- Create or update function to check if user can manage operations
CREATE OR REPLACE FUNCTION public.can_manage_operations(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_id 
    AND (p.role = 'ADMIN'::app_role OR p.user_role = ANY(ARRAY['owner'::user_role, 'manager'::user_role, 'space_manager'::user_role]))
  );
$$;