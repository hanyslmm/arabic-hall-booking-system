-- Add default working hours settings
INSERT INTO settings (key, value) VALUES 
('default_hall_working_hours_start', '08:00'),
('default_hall_working_hours_end', '20:00'),
('default_hall_working_days', 'saturday,monday,wednesday')
ON CONFLICT (key) DO NOTHING;

-- Create function to calculate time slot occupancy
CREATE OR REPLACE FUNCTION public.get_hall_time_slot_occupancy()
RETURNS TABLE(
  hall_id uuid,
  hall_name text,
  occupied_slots integer,
  available_slots integer,
  occupancy_percentage integer,
  working_hours_per_day integer,
  working_days_per_week integer
)
LANGUAGE plpgsql
AS $function$
DECLARE
  default_start_time time;
  default_end_time time;
  default_working_days text[];
BEGIN
  -- Get default working hours from settings
  SELECT value INTO default_start_time FROM settings WHERE key = 'default_hall_working_hours_start';
  SELECT value INTO default_end_time FROM settings WHERE key = 'default_hall_working_hours_end';
  SELECT string_to_array(value, ',') INTO default_working_days FROM settings WHERE key = 'default_hall_working_days';
  
  -- Default fallbacks
  IF default_start_time IS NULL THEN default_start_time := '08:00'::time; END IF;
  IF default_end_time IS NULL THEN default_end_time := '20:00'::time; END IF;
  IF default_working_days IS NULL THEN default_working_days := ARRAY['saturday', 'monday', 'wednesday']; END IF;

  RETURN QUERY
  WITH hall_working_hours AS (
    SELECT 
      h.id,
      h.name,
      COALESCE(h.operating_start_time, default_start_time) as start_time,
      COALESCE(h.operating_end_time, default_end_time) as end_time,
      -- Calculate working hours per day (in hours)
      EXTRACT(EPOCH FROM (COALESCE(h.operating_end_time, default_end_time) - COALESCE(h.operating_start_time, default_start_time))) / 3600 as hours_per_day,
      -- Working days count (default 3 days)
      array_length(default_working_days, 1) as days_per_week
    FROM public.halls h
  ),
  hall_bookings AS (
    SELECT 
      hwh.id,
      hwh.name,
      hwh.hours_per_day::integer as working_hours_per_day,
      hwh.days_per_week as working_days_per_week,
      -- Calculate total available time slots per week (hours * days)
      (hwh.hours_per_day * hwh.days_per_week)::integer as total_available_slots,
      -- Count active bookings for this hall
      COUNT(b.id) FILTER (WHERE b.status = 'active') as occupied_slots
    FROM hall_working_hours hwh
    LEFT JOIN public.bookings b ON b.hall_id = hwh.id 
      AND b.status = 'active'
      AND b.start_date <= CURRENT_DATE
      AND (b.end_date IS NULL OR b.end_date >= CURRENT_DATE)
    GROUP BY hwh.id, hwh.name, hwh.hours_per_day, hwh.days_per_week
  )
  SELECT 
    hb.id as hall_id,
    hb.name as hall_name,
    hb.occupied_slots::integer,
    hb.total_available_slots as available_slots,
    CASE 
      WHEN hb.total_available_slots > 0 
      THEN ROUND((hb.occupied_slots::numeric / hb.total_available_slots) * 100)::integer
      ELSE 0
    END as occupancy_percentage,
    hb.working_hours_per_day,
    hb.working_days_per_week
  FROM hall_bookings hb
  ORDER BY hb.name;
END;
$function$;