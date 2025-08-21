-- Fix teachers table by adding missing fields
ALTER TABLE public.teachers 
ADD COLUMN mobile_phone TEXT,
ADD COLUMN subject_id UUID REFERENCES academic_stages(id);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS on subjects table
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Create policies for subjects
CREATE POLICY "All users can view subjects" 
ON public.subjects 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage subjects" 
ON public.subjects 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() 
  AND (p.role = 'ADMIN' OR p.user_role IN ('owner', 'manager'))
));

-- Create teacher_academic_stages junction table
CREATE TABLE public.teacher_academic_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  academic_stage_id UUID NOT NULL REFERENCES public.academic_stages(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, academic_stage_id)
);

-- Enable RLS on teacher_academic_stages
ALTER TABLE public.teacher_academic_stages ENABLE ROW LEVEL SECURITY;

-- Create policies for teacher_academic_stages
CREATE POLICY "All users can view teacher stages" 
ON public.teacher_academic_stages 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage teacher stages" 
ON public.teacher_academic_stages 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() 
  AND (p.role = 'ADMIN' OR p.user_role IN ('owner', 'manager'))
));

-- Create working_hours table for occupancy calculation
CREATE TABLE public.working_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hall_id UUID NOT NULL REFERENCES public.halls(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(hall_id, day_of_week, start_time)
);

-- Enable RLS on working_hours
ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;

-- Create policies for working_hours
CREATE POLICY "All users can view working hours" 
ON public.working_hours 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage working hours" 
ON public.working_hours 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() 
  AND (p.role = 'ADMIN' OR p.user_role IN ('owner', 'manager'))
));

-- Fix subject_id in teachers to reference subjects table instead
ALTER TABLE public.teachers 
DROP CONSTRAINT IF EXISTS teachers_subject_id_fkey,
ADD CONSTRAINT teachers_subject_id_fkey 
FOREIGN KEY (subject_id) REFERENCES public.subjects(id);

-- Remove the conflict check function that prevents multiple reservations per teacher per hall
-- This allows the same teacher to have multiple time slots in the same hall
DROP FUNCTION IF EXISTS public.check_booking_conflict(uuid, time, text[], date, date, uuid);

-- Create new conflict check function that allows multiple reservations for same teacher/hall
-- but prevents time overlaps for the same hall
CREATE OR REPLACE FUNCTION public.check_booking_conflict(
  p_hall_id uuid, 
  p_start_time time without time zone, 
  p_days_of_week text[], 
  p_start_date date, 
  p_end_date date DEFAULT NULL::date, 
  p_booking_id uuid DEFAULT NULL::uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
  conflict_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.hall_id = p_hall_id
    AND b.start_time = p_start_time
    AND b.status = 'active'
    AND (p_booking_id IS NULL OR b.id != p_booking_id)
    AND b.days_of_week && p_days_of_week -- Array overlap operator
    AND (
      -- Check for date overlap
      (p_end_date IS NULL AND b.start_date <= p_start_date AND (b.end_date IS NULL OR b.end_date >= p_start_date)) OR
      (p_end_date IS NOT NULL AND b.start_date <= p_end_date AND (b.end_date IS NULL OR b.end_date >= p_start_date))
    )
  ) INTO conflict_exists;
  
  RETURN conflict_exists;
END;
$function$;

-- Insert default subjects
INSERT INTO public.subjects (name, created_by) VALUES
('الرياضيات', (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1)),
('العلوم', (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1)),
('الفيزياء', (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1)),
('الكيمياء', (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1)),
('الأحياء', (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1)),
('اللغة العربية', (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1)),
('اللغة الإنجليزية', (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1)),
('التاريخ', (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1)),
('الجغرافيا', (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1)),
('التربية الإسلامية', (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1)),
('الحاسوب', (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1)),
('التربية الفنية', (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1));

-- Insert default working hours (Sunday to Thursday, 8 AM to 3 PM)
INSERT INTO public.working_hours (hall_id, day_of_week, start_time, end_time)
SELECT 
  h.id as hall_id,
  day_num as day_of_week,
  '08:00:00'::time as start_time,
  '15:00:00'::time as end_time
FROM halls h
CROSS JOIN generate_series(0, 4) as day_num; -- Sunday(0) to Thursday(4)

-- Update triggers for updated_at
CREATE TRIGGER update_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_working_hours_updated_at
  BEFORE UPDATE ON public.working_hours
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();