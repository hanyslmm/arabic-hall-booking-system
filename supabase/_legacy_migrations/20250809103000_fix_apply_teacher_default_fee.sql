-- Ensure the RPC exists with proper privileges and visible to PostgREST
-- Redefine functions with SECURITY DEFINER and safe search_path

-- apply_teacher_default_fee
CREATE OR REPLACE FUNCTION public.apply_teacher_default_fee(
  p_teacher_id UUID,
  p_fee DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- apply_booking_fee
CREATE OR REPLACE FUNCTION public.apply_booking_fee(
  p_booking_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Grant execute to standard roles
GRANT EXECUTE ON FUNCTION public.apply_teacher_default_fee(UUID, DECIMAL) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_booking_fee(UUID) TO anon, authenticated, service_role;

-- Ask PostgREST to reload the schema cache so RPC shows up immediately
NOTIFY pgrst, 'reload schema';