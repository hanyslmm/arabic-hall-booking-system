// src/components/dashboard/StatsCards.tsx

import { useEffect, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { fetchMonthlyEarnings } from '@/utils/finance';

interface StatsCardsProps {
  selectedMonth: number; // 1-12
  selectedYear: number;  // four-digit year
}

const StatsCards = ({ selectedMonth, selectedYear }: StatsCardsProps) => {
  const [stats, setStats] = useState({ totalIncome: 0, totalExpenses: 0, occupancy: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try server RPC first if available
        const formattedMonth = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
        let totalIncome = 0;
        let totalExpenses = 0;
        let occupancy = 0;

        try {
          const { data, error } = await supabase.rpc('get_financial_summary', {
            p_month: formattedMonth,
          });
          if (error) throw error;
          if (data) {
            totalIncome = Number(data.total_income || 0);
            totalExpenses = Number(data.total_expenses || 0);
            occupancy = Number(data.occupancy_rate || 0);
          }
        } catch (_) {
          // Fallback path if RPC is missing or fails
          // 1) Income via existing robust RPC get_payments_sum
          totalIncome = await fetchMonthlyEarnings(selectedMonth, selectedYear);
          totalExpenses = 0; // No expenses table yet

          // 2) Occupancy: proportion of halls that have at least one booking overlapping the month
          const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
          const endOfMonthExclusive = new Date(selectedYear, selectedMonth, 1);
          const startStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-${String(startOfMonth.getDate()).padStart(2, '0')}`;
          const endStr = `${endOfMonthExclusive.getFullYear()}-${String(endOfMonthExclusive.getMonth() + 1).padStart(2, '0')}-${String(endOfMonthExclusive.getDate()).padStart(2, '0')}`;

          // Count halls
          const { count: hallsCount } = await supabase
            .from('halls')
            .select('id', { count: 'exact', head: true });

          // Fetch bookings that could overlap this month (start_date <= endOfMonth)
          const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select('hall_id, start_date, end_date, status')
            .lte('start_date', endStr);

          if (bookingsError) throw bookingsError;

          const activeOverlapping = (bookingsData || []).filter((b: any) => {
            if (b.status && String(b.status).toLowerCase() === 'cancelled') return false;
            const endDate = b.end_date ? new Date(b.end_date) : null;
            // Overlap if booking has no end or ends on/after start of month
            return !endDate || endDate >= startOfMonth;
          });

          const uniqueHallIds = new Set<string>(activeOverlapping.map((b: any) => b.hall_id));
          occupancy = hallsCount && hallsCount > 0 ? (uniqueHallIds.size / hallsCount) * 100 : 0;
        }

        setStats({
          totalIncome,
          totalExpenses,
          occupancy,
        });
      } catch (err: any) {
        console.error('Error fetching financial summary:', err);
        setError('Could not load stats.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedMonth, selectedYear]);

  const formatCurrency = (value: number) => {
    // Use English digits formatting and append Arabic currency label for consistency with reports page
    return `${Number(value || 0).toLocaleString('en-EG')} جنيه`;
  };

  if (loading) return <div>Loading stats...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">اجمالي الدخل</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalIncome)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">اجمالي المصروفات</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalExpenses)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">نسبة الاشغال</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.occupancy.toFixed(1)}%</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsCards;
