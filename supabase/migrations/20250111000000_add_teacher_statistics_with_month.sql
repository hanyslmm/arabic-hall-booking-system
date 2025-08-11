-- Create function to get teacher statistics for a specific month/year
CREATE OR REPLACE FUNCTION public.get_teacher_statistics_by_month(
    p_teacher_id uuid,
    p_month integer DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::integer,
    p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer
)
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
SET search_path = ''
AS $$
DECLARE
    month_start date;
    month_end date;
BEGIN
    -- Get specified month date range
    month_start := date_trunc('month', make_date(p_year, p_month, 1));
    month_end := (date_trunc('month', make_date(p_year, p_month, 1)) + interval '1 month' - interval '1 day')::date;
    
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
        -- Monthly earnings for specified month
        (SELECT COALESCE(SUM(pr.amount), 0) FROM teacher_payments pr 
         WHERE pr.payment_date >= month_start AND pr.payment_date <= month_end) as monthly_earnings,
        -- Pending payments count
        (SELECT COUNT(*) FROM teacher_registrations tr WHERE tr.payment_status = 'pending') as pending_payments,
        -- Attendance rate (placeholder - can be enhanced with actual attendance data)
        85.0 as attendance_rate;
END;
$$;