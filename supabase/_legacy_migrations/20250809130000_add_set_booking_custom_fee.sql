-- Create RPC to set custom fee for a booking and apply it to all registrations atomically
CREATE OR REPLACE FUNCTION public.set_booking_custom_fee(
  p_booking_id UUID,
  p_fee DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the booking to be custom and set the new fee
  UPDATE public.bookings
  SET class_fees = p_fee,
      is_custom_fee = true,
      updated_at = now()
  WHERE id = p_booking_id;

  -- Propagate the new fee to registrations and recompute payment status
  UPDATE public.student_registrations sr
  SET total_fees = p_fee,
      payment_status = CASE 
        WHEN sr.paid_amount = 0 THEN 'pending'
        WHEN sr.paid_amount >= p_fee THEN 'paid'
        ELSE 'partial'
      END,
      updated_at = now()
  WHERE sr.booking_id = p_booking_id;
END;
$$;

-- Grant execution to common roles
GRANT EXECUTE ON FUNCTION public.set_booking_custom_fee(UUID, DECIMAL) TO anon, authenticated, service_role;

-- Ensure PostgREST sees the new RPC immediately
NOTIFY pgrst, 'reload schema';