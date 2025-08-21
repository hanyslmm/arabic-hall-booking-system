-- RPC to sum payments in a date range to avoid client-side 1000 row caps
CREATE OR REPLACE FUNCTION public.get_payments_sum(
  start_date DATE,
  end_date DATE
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(amount), 0)::NUMERIC
  FROM public.payment_records
  WHERE payment_date >= start_date
    AND payment_date <= end_date;
$$;

-- Allow all users who can select from payment_records to execute this function
GRANT EXECUTE ON FUNCTION public.get_payments_sum(DATE, DATE) TO anon, authenticated, service_role;