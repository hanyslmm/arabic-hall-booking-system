-- Continue updating remaining table policies
-- Update subjects table policies
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;

CREATE POLICY "Admins and managers can view subjects" 
ON public.subjects 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage subjects data" 
ON public.subjects 
FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'ADMIN'::app_role
));

CREATE POLICY "Only admins can insert subjects" 
ON public.subjects 
FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'ADMIN'::app_role
));

CREATE POLICY "Only admins can delete subjects" 
ON public.subjects 
FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'ADMIN'::app_role
));

-- Update academic_stages table policies
DROP POLICY IF EXISTS "Admins can manage academic stages" ON public.academic_stages;
DROP POLICY IF EXISTS "Owners and managers can manage academic stages" ON public.academic_stages;

CREATE POLICY "Admins and managers can view academic stages" 
ON public.academic_stages 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage academic stages data" 
ON public.academic_stages 
FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'ADMIN'::app_role
));

CREATE POLICY "Only admins can insert academic stages" 
ON public.academic_stages 
FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'ADMIN'::app_role
));

CREATE POLICY "Only admins can delete academic stages" 
ON public.academic_stages 
FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'ADMIN'::app_role
));