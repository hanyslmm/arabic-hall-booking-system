-- Add default_class_fee to teachers
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS default_class_fee DECIMAL(10,2) DEFAULT 0;

-- Add is_custom_fee to bookings to allow per-class overrides
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS is_custom_fee BOOLEAN NOT NULL DEFAULT false;

-- Function: apply teacher default fee to all non-custom classes and their registrations
CREATE OR REPLACE FUNCTION public.apply_teacher_default_fee(
  p_teacher_id UUID,
  p_fee DECIMAL
)
RETURNS VOID AS $$
BEGIN
  -- Update teacher default
  UPDATE public.teachers
  SET default_class_fee = p_fee,
      updated_at = now()
  WHERE id = p_teacher_id;

  -- Update all non-custom active bookings for this teacher
  UPDATE public.bookings b
  SET class_fees = p_fee,
      updated_at = now()
  WHERE b.teacher_id = p_teacher_id
    AND (b.status IS NULL OR b.status = 'active')
    AND b.is_custom_fee = false;

  -- Propagate to registrations for affected (non-custom) bookings
  UPDATE public.student_registrations sr
  SET total_fees = b.class_fees,
      payment_status = CASE 
        WHEN sr.paid_amount = 0 THEN 'pending'
        WHEN sr.paid_amount >= b.class_fees THEN 'paid'
        ELSE 'partial'
      END,
      updated_at = now()
  FROM public.bookings b
  WHERE b.teacher_id = p_teacher_id
    AND b.is_custom_fee = false
    AND sr.booking_id = b.id;
END;
$$ LANGUAGE plpgsql;

-- Function: apply current booking fee to its registrations
CREATE OR REPLACE FUNCTION public.apply_booking_fee(
  p_booking_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.student_registrations sr
  SET total_fees = b.class_fees,
      payment_status = CASE 
        WHEN sr.paid_amount = 0 THEN 'pending'
        WHEN sr.paid_amount >= b.class_fees THEN 'paid'
        ELSE 'partial'
      END,
      updated_at = now()
  FROM public.bookings b
  WHERE b.id = p_booking_id
    AND sr.booking_id = b.id;
END;
$$ LANGUAGE plpgsql;

-- Trigger: when booking.class_fees changes, sync its registrations automatically
CREATE OR REPLACE FUNCTION public.sync_registration_fees_on_booking_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.class_fees IS DISTINCT FROM OLD.class_fees THEN
    UPDATE public.student_registrations sr
    SET total_fees = NEW.class_fees,
        payment_status = CASE 
          WHEN sr.paid_amount = 0 THEN 'pending'
          WHEN sr.paid_amount >= NEW.class_fees THEN 'paid'
          ELSE 'partial'
        END,
        updated_at = now()
    WHERE sr.booking_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_registration_fees_on_booking_update ON public.bookings;
CREATE TRIGGER trigger_sync_registration_fees_on_booking_update
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_registration_fees_on_booking_update();