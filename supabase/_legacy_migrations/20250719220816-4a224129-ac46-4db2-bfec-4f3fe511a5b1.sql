-- Create students table for student information management
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mobile_phone TEXT NOT NULL UNIQUE,
  parent_phone TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create student_registrations table to link students with bookings (courses)
CREATE TABLE public.student_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  total_fees DECIMAL(10,2) DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(student_id, booking_id)
);

-- Create attendance_records table for tracking student attendance
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_registration_id UUID NOT NULL REFERENCES public.student_registrations(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(student_registration_id, attendance_date)
);

-- Create payment_records table for tracking payments
CREATE TABLE public.payment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_registration_id UUID NOT NULL REFERENCES public.student_registrations(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'transfer', 'other')),
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on all new tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for students table
CREATE POLICY "All users can view students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Admins and managers can manage students" ON public.students FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND (p.role = 'ADMIN' OR p.user_role IN ('owner', 'manager'))
));

-- RLS policies for student_registrations table
CREATE POLICY "All users can view registrations" ON public.student_registrations FOR SELECT USING (true);
CREATE POLICY "Admins and managers can manage registrations" ON public.student_registrations FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND (p.role = 'ADMIN' OR p.user_role IN ('owner', 'manager'))
));

-- RLS policies for attendance_records table
CREATE POLICY "All users can view attendance" ON public.attendance_records FOR SELECT USING (true);
CREATE POLICY "Admins and managers can manage attendance" ON public.attendance_records FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND (p.role = 'ADMIN' OR p.user_role IN ('owner', 'manager'))
));

-- RLS policies for payment_records table
CREATE POLICY "All users can view payments" ON public.payment_records FOR SELECT USING (true);
CREATE POLICY "Admins and managers can manage payments" ON public.payment_records FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.id = auth.uid() AND (p.role = 'ADMIN' OR p.user_role IN ('owner', 'manager'))
));

-- Function to generate unique serial number for students
CREATE OR REPLACE FUNCTION public.generate_student_serial()
RETURNS TEXT AS $$
DECLARE
  new_serial TEXT;
  counter INTEGER := 1;
BEGIN
  LOOP
    new_serial := 'STD' || LPAD(counter::TEXT, 6, '0');
    
    IF NOT EXISTS (SELECT 1 FROM public.students WHERE serial_number = new_serial) THEN
      RETURN new_serial;
    END IF;
    
    counter := counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate serial number for new students
CREATE OR REPLACE FUNCTION public.set_student_serial()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.serial_number IS NULL OR NEW.serial_number = '' THEN
    NEW.serial_number := public.generate_student_serial();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_student_serial
  BEFORE INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.set_student_serial();

-- Trigger to update payment status in student_registrations
CREATE OR REPLACE FUNCTION public.update_registration_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid DECIMAL(10,2);
  reg_fees DECIMAL(10,2);
BEGIN
  -- Get the registration record
  SELECT total_fees INTO reg_fees 
  FROM public.student_registrations 
  WHERE id = COALESCE(NEW.student_registration_id, OLD.student_registration_id);
  
  -- Calculate total paid amount
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM public.payment_records 
  WHERE student_registration_id = COALESCE(NEW.student_registration_id, OLD.student_registration_id);
  
  -- Update the registration record
  UPDATE public.student_registrations 
  SET 
    paid_amount = total_paid,
    payment_status = CASE 
      WHEN total_paid = 0 THEN 'pending'
      WHEN total_paid >= reg_fees THEN 'paid'
      ELSE 'partial'
    END,
    updated_at = now()
  WHERE id = COALESCE(NEW.student_registration_id, OLD.student_registration_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_status_insert
  AFTER INSERT ON public.payment_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_registration_payment_status();

CREATE TRIGGER trigger_update_payment_status_update
  AFTER UPDATE ON public.payment_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_registration_payment_status();

CREATE TRIGGER trigger_update_payment_status_delete
  AFTER DELETE ON public.payment_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_registration_payment_status();

-- Add updated_at triggers for all new tables
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_registrations_updated_at
  BEFORE UPDATE ON public.student_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to search students by mobile or serial number
CREATE OR REPLACE FUNCTION public.search_student(search_term TEXT)
RETURNS TABLE(
  id UUID,
  serial_number TEXT,
  name TEXT,
  mobile_phone TEXT,
  parent_phone TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.serial_number,
    s.name,
    s.mobile_phone,
    s.parent_phone,
    s.city,
    s.created_at
  FROM public.students s
  WHERE s.mobile_phone = search_term 
     OR s.serial_number = search_term
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;