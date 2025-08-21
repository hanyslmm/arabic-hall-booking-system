-- Add teacher login capabilities and teacher role
-- First add 'teacher' to user_role enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'teacher' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
        ALTER TYPE user_role ADD VALUE 'teacher';
    END IF;
END $$;

-- Add username field to profiles for teacher login
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Add teacher_id field to profiles to link with teachers table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL;

-- Create missing database functions that are referenced in the code
CREATE OR REPLACE FUNCTION public.get_payments_sum(start_date date, end_date date)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_sum numeric;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO total_sum
    FROM public.payment_records
    WHERE payment_date >= start_date AND payment_date <= end_date;
    
    RETURN total_sum;
END;
$$;

-- Create apply_teacher_default_fee function
CREATE OR REPLACE FUNCTION public.apply_teacher_default_fee(p_teacher_id uuid, p_fee numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update all active bookings for this teacher with the new default fee
    UPDATE public.bookings 
    SET class_fees = p_fee,
        is_custom_fee = false
    WHERE teacher_id = p_teacher_id 
    AND status = 'active'
    AND (is_custom_fee = false OR is_custom_fee IS NULL);
    
    -- Update the teacher's default fee
    UPDATE public.teachers 
    SET default_class_fee = p_fee 
    WHERE id = p_teacher_id;
END;
$$;

-- Create set_booking_custom_fee function
CREATE OR REPLACE FUNCTION public.set_booking_custom_fee(p_booking_id uuid, p_fee numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update booking with custom fee
    UPDATE public.bookings 
    SET class_fees = p_fee,
        is_custom_fee = true
    WHERE id = p_booking_id;
    
    -- Update related registrations
    UPDATE public.student_registrations 
    SET total_fees = p_fee,
        payment_status = CASE 
            WHEN paid_amount >= p_fee THEN 'paid'
            WHEN paid_amount > 0 THEN 'partial'
            ELSE 'pending'
        END
    WHERE booking_id = p_booking_id;
END;
$$;

-- Create apply_booking_fee function
CREATE OR REPLACE FUNCTION public.apply_booking_fee(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    booking_fee numeric;
BEGIN
    -- Get the booking fee
    SELECT class_fees INTO booking_fee
    FROM public.bookings
    WHERE id = p_booking_id;
    
    -- Update related registrations
    UPDATE public.student_registrations 
    SET total_fees = booking_fee,
        payment_status = CASE 
            WHEN paid_amount >= booking_fee THEN 'paid'
            WHEN paid_amount > 0 THEN 'partial'
            ELSE 'pending'
        END
    WHERE booking_id = p_booking_id;
END;
$$;

-- Add is_custom_fee column to bookings if not exists
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_custom_fee boolean DEFAULT false;

-- Add default_class_fee column to teachers if not exists  
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS default_class_fee numeric DEFAULT 0;

-- Create RLS policies for teachers to access their own data
CREATE POLICY "Teachers can view their own bookings" 
ON public.bookings 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.user_role = 'teacher' 
        AND p.teacher_id = bookings.teacher_id
    )
);

CREATE POLICY "Teachers can view their own student registrations" 
ON public.student_registrations 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        JOIN public.bookings b ON b.teacher_id = p.teacher_id
        WHERE p.id = auth.uid() 
        AND p.user_role = 'teacher' 
        AND b.id = student_registrations.booking_id
    )
);

CREATE POLICY "Teachers can view their own payment records" 
ON public.payment_records 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p 
        JOIN public.bookings b ON b.teacher_id = p.teacher_id
        JOIN public.student_registrations sr ON sr.booking_id = b.id
        WHERE p.id = auth.uid() 
        AND p.user_role = 'teacher' 
        AND sr.id = payment_records.student_registration_id
    )
);

-- Create function to get teacher statistics
CREATE OR REPLACE FUNCTION public.get_teacher_statistics(p_teacher_id uuid)
RETURNS TABLE(
    total_students bigint,
    total_classes bigint,
    total_earnings numeric,
    monthly_earnings numeric,
    pending_payments bigint,
    attendance_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_month_start date;
    current_month_end date;
BEGIN
    -- Get current month date range
    current_month_start := date_trunc('month', CURRENT_DATE);
    current_month_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date;
    
    RETURN QUERY
    WITH teacher_bookings AS (
        SELECT b.id as booking_id
        FROM public.bookings b
        WHERE b.teacher_id = p_teacher_id AND b.status = 'active'
    ),
    teacher_registrations AS (
        SELECT sr.*
        FROM public.student_registrations sr
        JOIN teacher_bookings tb ON tb.booking_id = sr.booking_id
    ),
    teacher_payments AS (
        SELECT pr.*
        FROM public.payment_records pr
        JOIN teacher_registrations tr ON tr.id = pr.student_registration_id
    )
    SELECT 
        -- Total unique students
        (SELECT COUNT(DISTINCT sr.student_id) FROM teacher_registrations sr) as total_students,
        -- Total active classes
        (SELECT COUNT(*) FROM teacher_bookings) as total_classes,
        -- Total earnings (all time)
        (SELECT COALESCE(SUM(pr.amount), 0) FROM teacher_payments pr) as total_earnings,
        -- Monthly earnings
        (SELECT COALESCE(SUM(pr.amount), 0) FROM teacher_payments pr 
         WHERE pr.payment_date >= current_month_start AND pr.payment_date <= current_month_end) as monthly_earnings,
        -- Pending payments count
        (SELECT COUNT(*) FROM teacher_registrations tr WHERE tr.payment_status = 'pending') as pending_payments,
        -- Attendance rate (placeholder - can be enhanced with actual attendance data)
        85.0 as attendance_rate;
END;
$$;