-- Update teacher codes and add class code generation
ALTER TABLE teachers ADD COLUMN teacher_code TEXT;

-- Update existing teachers with codes (this is one-time setup)
UPDATE teachers SET teacher_code = 'B' WHERE name = 'Basim Rashid';
UPDATE teachers SET teacher_code = 'T' WHERE name = 'Test';

-- Add class_code column to bookings table
ALTER TABLE bookings ADD COLUMN class_code TEXT;

-- Create function to generate class codes
CREATE OR REPLACE FUNCTION generate_class_code(
  p_teacher_id UUID,
  p_days_of_week TEXT[],
  p_start_time TIME
) RETURNS TEXT AS $$
DECLARE
  teacher_code TEXT;
  days_code TEXT;
  time_code TEXT;
  result_code TEXT;
BEGIN
  -- Get teacher code
  SELECT COALESCE(t.teacher_code, UPPER(LEFT(t.name, 1))) INTO teacher_code
  FROM teachers t WHERE t.id = p_teacher_id;
  
  -- Generate days code based on the most frequent pattern
  CASE 
    WHEN 'saturday' = ANY(p_days_of_week) AND 'monday' = ANY(p_days_of_week) AND 'wednesday' = ANY(p_days_of_week) THEN
      days_code := 'SAT';
    WHEN 'sunday' = ANY(p_days_of_week) AND 'tuesday' = ANY(p_days_of_week) AND 'thursday' = ANY(p_days_of_week) THEN
      days_code := 'SUN';
    WHEN 'monday' = ANY(p_days_of_week) AND 'wednesday' = ANY(p_days_of_week) AND 'friday' = ANY(p_days_of_week) THEN
      days_code := 'MON';
    ELSE
      -- Default to first day
      days_code := UPPER(LEFT(p_days_of_week[1], 3));
  END CASE;
  
  -- Generate time code (extract hour)
  time_code := EXTRACT(HOUR FROM p_start_time)::TEXT;
  
  -- Combine all parts
  result_code := teacher_code || '_' || days_code || '_' || time_code;
  
  RETURN result_code;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate class codes
CREATE OR REPLACE FUNCTION set_booking_class_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.class_code := generate_class_code(NEW.teacher_id, NEW.days_of_week, NEW.start_time);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for INSERT and UPDATE
CREATE TRIGGER trigger_set_booking_class_code_insert
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_class_code();

CREATE TRIGGER trigger_set_booking_class_code_update
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.teacher_id IS DISTINCT FROM NEW.teacher_id OR 
        OLD.days_of_week IS DISTINCT FROM NEW.days_of_week OR 
        OLD.start_time IS DISTINCT FROM NEW.start_time)
  EXECUTE FUNCTION set_booking_class_code();

-- Update existing bookings with class codes
UPDATE bookings SET class_code = generate_class_code(teacher_id, days_of_week, start_time) WHERE class_code IS NULL;

-- Create function to get actual occupancy based on student registrations
CREATE OR REPLACE FUNCTION get_hall_actual_occupancy_updated()
RETURNS TABLE(hall_id uuid, hall_name text, capacity integer, registered_students bigint, occupancy_percentage numeric) AS $$
BEGIN
  RETURN QUERY
  WITH hall_registrations AS (
    SELECT 
      h.id as hall_id,
      h.name as hall_name,
      h.capacity,
      COUNT(DISTINCT sr.student_id) as registered_students
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
$$ LANGUAGE plpgsql;