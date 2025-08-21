-- Fix hall occupancy calculation to properly handle multiple bookings per hall
-- The issue was that we were counting all students across all time slots but comparing against single hall capacity

CREATE OR REPLACE FUNCTION get_hall_actual_occupancy_updated()
RETURNS TABLE(hall_id uuid, hall_name text, capacity integer, registered_students bigint, occupancy_percentage numeric) AS $$
BEGIN
  RETURN QUERY
  WITH hall_booking_stats AS (
    SELECT 
      h.id as hall_id,
      h.name as hall_name,
      h.capacity,
      COUNT(DISTINCT b.id) as active_bookings,
      COUNT(DISTINCT sr.student_id) as total_registered_students
    FROM public.halls h
    LEFT JOIN public.bookings b ON h.id = b.hall_id AND b.status = 'active'
    LEFT JOIN public.student_registrations sr ON b.id = sr.booking_id
    GROUP BY h.id, h.name, h.capacity
  )
  SELECT 
    hbs.hall_id,
    hbs.hall_name,
    hbs.capacity,
    hbs.total_registered_students as registered_students,
    CASE 
      WHEN hbs.capacity > 0 AND hbs.active_bookings > 0
      THEN ROUND((hbs.total_registered_students::numeric / (hbs.capacity * hbs.active_bookings)) * 100, 2)
      WHEN hbs.capacity > 0 AND hbs.active_bookings = 0
      THEN 0
      ELSE 0
    END as occupancy_percentage
  FROM hall_booking_stats hbs
  ORDER BY hbs.hall_name;
END;
$$ LANGUAGE plpgsql;

-- Also create an alternative function that shows average occupancy per time slot
CREATE OR REPLACE FUNCTION get_hall_average_occupancy_per_slot()
RETURNS TABLE(hall_id uuid, hall_name text, capacity integer, registered_students bigint, occupancy_percentage numeric) AS $$
BEGIN
  RETURN QUERY
  WITH booking_occupancy AS (
    SELECT 
      h.id as hall_id,
      h.name as hall_name,
      h.capacity,
      b.id as booking_id,
      COUNT(sr.student_id) as booking_students
    FROM public.halls h
    LEFT JOIN public.bookings b ON h.id = b.hall_id AND b.status = 'active'
    LEFT JOIN public.student_registrations sr ON b.id = sr.booking_id
    GROUP BY h.id, h.name, h.capacity, b.id
  ),
  hall_avg_occupancy AS (
    SELECT 
      bo.hall_id,
      bo.hall_name,
      bo.capacity,
      SUM(bo.booking_students) as total_students,
      COUNT(CASE WHEN bo.booking_id IS NOT NULL THEN 1 END) as active_bookings,
      AVG(
        CASE 
          WHEN bo.capacity > 0 AND bo.booking_id IS NOT NULL
          THEN (bo.booking_students::numeric / bo.capacity) * 100
          ELSE 0
        END
      ) as avg_occupancy_percentage
    FROM booking_occupancy bo
    GROUP BY bo.hall_id, bo.hall_name, bo.capacity
  )
  SELECT 
    hao.hall_id,
    hao.hall_name,
    hao.capacity,
    hao.total_students as registered_students,
    COALESCE(ROUND(hao.avg_occupancy_percentage, 2), 0) as occupancy_percentage
  FROM hall_avg_occupancy hao
  ORDER BY hao.hall_name;
END;
$$ LANGUAGE plpgsql;