-- Add class fees to bookings table
ALTER TABLE public.bookings 
ADD COLUMN class_fees DECIMAL(10,2) DEFAULT 0;

-- Update student_registrations to automatically set fees from booking
CREATE OR REPLACE FUNCTION public.sync_registration_fees()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new registration is created, set fees from booking if not specified
  IF NEW.total_fees = 0 OR NEW.total_fees IS NULL THEN
    SELECT class_fees INTO NEW.total_fees 
    FROM public.bookings 
    WHERE id = NEW.booking_id;
    
    -- If still null, set to 0
    IF NEW.total_fees IS NULL THEN
      NEW.total_fees := 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync fees
CREATE TRIGGER sync_registration_fees_trigger
  BEFORE INSERT ON public.student_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_registration_fees();