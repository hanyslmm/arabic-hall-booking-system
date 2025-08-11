import { supabase } from "@/integrations/supabase/client";

function formatDate(date: Date): string {
  // Returns YYYY-MM-DD in local time
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function getCurrentMonthDateRange(): Promise<{ startDate: string; endDateExclusive: string }> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { startDate: formatDate(start), endDateExclusive: formatDate(nextMonthStart) };
}

export async function getMonthDateRange(month: number, year: number): Promise<{ startDate: string; endDateExclusive: string }> {
  const start = new Date(year, month - 1, 1); // month is 1-indexed, Date constructor expects 0-indexed
  const nextMonthStart = new Date(year, month, 1);
  return { startDate: formatDate(start), endDateExclusive: formatDate(nextMonthStart) };
}

export async function fetchMonthlyEarnings(month?: number, year?: number): Promise<number> {
  const { startDate, endDateExclusive } = month && year 
    ? await getMonthDateRange(month, year)
    : await getCurrentMonthDateRange();

  // Try RPC first (fast, server-side sum, no row cap)
  try {
    const inclusiveEndDate = formatDate(new Date(new Date(endDateExclusive).getTime() - 24 * 60 * 60 * 1000));
    const { data, error } = await supabase.rpc('get_payments_sum', { start_date: startDate, end_date: inclusiveEndDate });
    if (error) throw error;
    if (typeof data === 'number') return Number(data || 0);
  } catch (_) {
    // Fallback below
  }

  // Fallback: paginate through all matching rows and sum amounts client-side
  const pageSize = 1000;
  let offset = 0;
  let total = 0;

  // We filter by gte startDate and lt endDateExclusive to avoid timezone ambiguity
  // and to include all dates within the month.
  // Loop until fewer than pageSize rows are returned.
  // Only request the minimal column needed: amount
  // Note: range is inclusive on both ends, so compute end index carefully.
  while (true) {
    const { data, error } = await supabase
      .from('payment_records')
      .select('amount')
      .gte('payment_date', startDate)
      .lt('payment_date', endDateExclusive)
      .order('payment_date', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    const rows = (data as Array<{ amount: number }>) || [];
    for (const row of rows) {
      total += Number(row.amount || 0);
    }

    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return total;
}