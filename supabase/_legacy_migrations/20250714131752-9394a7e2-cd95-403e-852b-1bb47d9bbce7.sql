-- Create RPC function to calculate hall occupancy rates
CREATE OR REPLACE FUNCTION public.get_hall_occupancy_rates()
RETURNS TABLE(
  hall_id uuid,
  name text,
  occupancy_percentage numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH hall_operating_hours AS (
    SELECT 
      h.id,
      h.name,
      CASE 
        WHEN h.operating_start_time IS NOT NULL AND h.operating_end_time IS NOT NULL
        THEN EXTRACT(EPOCH FROM (h.operating_end_time - h.operating_start_time)) / 3600
        ELSE 8 -- Default 8 hours if not set
      END as daily_operating_hours
    FROM public.halls h
  ),
  today_bookings AS (
    SELECT 
      b.hall_id,
      COUNT(*) as booking_count
    FROM public.bookings b
    WHERE b.status = 'active'
      AND b.start_date <= CURRENT_DATE
      AND (b.end_date IS NULL OR b.end_date >= CURRENT_DATE)
      AND ARRAY[
        CASE EXTRACT(DOW FROM CURRENT_DATE)
          WHEN 0 THEN 'sunday'
          WHEN 1 THEN 'monday'
          WHEN 2 THEN 'tuesday'
          WHEN 3 THEN 'wednesday'
          WHEN 4 THEN 'thursday'
          WHEN 5 THEN 'friday'
          WHEN 6 THEN 'saturday'
        END
      ] && b.days_of_week
    GROUP BY b.hall_id
  )
  SELECT 
    hoh.id as hall_id,
    hoh.name,
    CASE 
      WHEN hoh.daily_operating_hours > 0 
      THEN ROUND((COALESCE(tb.booking_count, 0)::numeric / hoh.daily_operating_hours) * 100, 2)
      ELSE 0
    END as occupancy_percentage
  FROM hall_operating_hours hoh
  LEFT JOIN today_bookings tb ON hoh.id = tb.hall_id
  ORDER BY hoh.name;
END;
$$;