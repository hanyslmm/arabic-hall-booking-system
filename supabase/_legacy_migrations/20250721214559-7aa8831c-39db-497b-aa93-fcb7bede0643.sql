-- Create function to get actual hall occupancy based on registered students
CREATE OR REPLACE FUNCTION public.get_hall_actual_occupancy()
RETURNS TABLE(
  hall_id UUID,
  hall_name TEXT,
  capacity INTEGER,
  registered_students BIGINT,
  occupancy_percentage NUMERIC
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH hall_registrations AS (
    SELECT 
      h.id as hall_id,
      h.name as hall_name,
      h.capacity,
      COUNT(sr.id) as registered_students
    FROM public.halls h
    LEFT JOIN public.bookings b ON h.id = b.hall_id AND b.status = 'active'
    LEFT JOIN public.student_registrations sr ON b.id = sr.booking_id
    GROUP BY h.id, h.name, h.capacity
  )
  SELECT 
    hr.hall_id,
    hr.hall_name,
    hr.capacity,
    hr.registered_students,
    CASE 
      WHEN hr.capacity > 0 
      THEN ROUND((hr.registered_students::numeric / hr.capacity) * 100, 2)
      ELSE 0
    END as occupancy_percentage
  FROM hall_registrations hr
  ORDER BY hr.hall_name;
END;
$function$;