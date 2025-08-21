-- Update the generate_class_code function to include AM/PM
CREATE OR REPLACE FUNCTION public.generate_class_code(p_teacher_id uuid, p_days_of_week text[], p_start_time time without time zone)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  teacher_code TEXT;
  days_code TEXT;
  time_code TEXT;
  am_pm_suffix TEXT;
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
  
  -- Determine AM/PM suffix
  IF EXTRACT(HOUR FROM p_start_time) >= 12 THEN
    am_pm_suffix := 'PM';
  ELSE
    am_pm_suffix := 'AM';
  END IF;
  
  -- Combine all parts
  result_code := teacher_code || '_' || days_code || '_' || time_code || '_' || am_pm_suffix;
  
  RETURN result_code;
END;
$function$;