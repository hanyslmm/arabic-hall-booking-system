-- supabase/migrations/20250814160000_fix_financial_summary_rpc.sql

-- First, we drop the old function to ensure a clean replacement   
DROP FUNCTION IF EXISTS public.get_financial_summary(date);

-- Now, we create the new version of the function.
-- The only change is that the input parameter is now TEXT instead of DATE.
CREATE OR REPLACE FUNCTION public.get_financial_summary(p_month text)
RETURNS TABLE(total_income numeric, total_expenses numeric, occupancy_rate numeric)
LANGUAGE plpgsql
AS $$
DECLARE
    -- We create a variable to hold the start and end dates of the selected month.
    start_date date;
    end_date date;
BEGIN
    -- Here, we convert the incoming text (like '2025-08-01') into a proper date.
    start_date := date_trunc('month', p_month::date);
    end_date := start_date + interval '1 month';

    RETURN QUERY
    SELECT
        -- Calculate total income for the month
        COALESCE(SUM(pr.amount), 0)::numeric AS total_income,
        
        -- Calculate total expenses for the month (placeholder, as there is no expenses table)
        0::numeric AS total_expenses,
        
        -- Calculate occupancy rate for the month
        (
            SELECT COALESCE(
                (COUNT(DISTINCT b.hall_id)::numeric / NULLIF(COUNT(DISTINCT h.id), 0)::numeric) * 100,
                0
            )
            FROM public.halls h
            LEFT JOIN public.bookings b ON h.id = b.hall_id AND b.start_time >= start_date AND b.start_time < end_date
        )::numeric AS occupancy_rate

    FROM
        public.payment_records pr
    WHERE
        pr.payment_date >= start_date AND pr.payment_date < end_date;
END;
$$;
