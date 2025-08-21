-- Step 1.2: Update RLS policies for Manager role (corrected)
-- Update bookings table policies
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Managers can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Owners and managers can delete bookings" ON public.bookings;
DROP POLICY IF EXISTS "Owners and managers can update bookings" ON public.bookings;

CREATE POLICY "Admins and managers can manage all bookings" 
ON public.bookings 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND (p.role = 'ADMIN'::app_role OR p.user_role IN ('owner'::user_role, 'manager'::user_role))
));

-- Update teachers table policies  
DROP POLICY IF EXISTS "Admins can manage teachers" ON public.teachers;
DROP POLICY IF EXISTS "Owners and managers can manage teachers" ON public.teachers;

CREATE POLICY "Admins and managers can manage teachers" 
ON public.teachers 
FOR ALL 
USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND (p.role = 'ADMIN'::app_role OR p.user_role IN ('owner'::user_role, 'manager'::user_role))
));

-- Update halls table policies
DROP POLICY IF EXISTS "Admins can manage halls" ON public.halls;

CREATE POLICY "Admins and managers can view halls" 
ON public.halls 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage halls data" 
ON public.halls 
FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'ADMIN'::app_role
));

CREATE POLICY "Only admins can insert halls" 
ON public.halls 
FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'ADMIN'::app_role
));

CREATE POLICY "Only admins can delete halls" 
ON public.halls 
FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'ADMIN'::app_role
));