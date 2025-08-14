import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { FastReceptionistModal } from "@/components/receptionist/FastReceptionistModal";
import StatsCards from "@/components/dashboard/StatsCards";
import { MonthSelector } from "@/components/dashboard/MonthSelector";
import { HallsGrid } from "@/components/dashboard/HallsGrid";
import { useAuth } from "@/hooks/useAuth";
import { AdminDataDiagnostic } from "@/components/AdminDataDiagnostic";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function AdminDashboard() {
  const { profile } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isFastReceptionistOpen, setIsFastReceptionistOpen] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  // Local permission helper to align with `can('create:registrations')`
  const can = (permission: string) => {
    if (permission === 'create:registrations') {
      // Allow all non-teacher roles (consistent with registrations page)
      return profile?.user_role !== 'teacher';
    }
    return false;
  };

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  // Fetch per-hall occupancy for the grid (RPC first, then fallback)
  const { data: occupancyData } = useQuery({
    queryKey: ['hall-occupancy-dashboard'],
    queryFn: async () => {
      const clampPercentage = (value: number) => {
        if (!isFinite(value) || isNaN(value)) return 0;
        return Math.max(0, Math.min(100, Number(value)));
      };

      // Preferred: average occupancy per time slot if RPC exists
      try {
        const { data, error } = await supabase.rpc('get_hall_average_occupancy_per_slot');
        if (error) throw error;
        if (data) {
          return (data as any[]).map((row) => ({
            hall_id: row.hall_id,
            name: row.hall_name ?? row.name ?? '',
            occupancy_percentage: clampPercentage(Number(row.occupancy_percentage ?? 0)),
          }));
        }
      } catch (_) {
        // noop -> fallback
      }

      // Fallback: server function that might overcount; clamp for safety
      try {
        const { data, error } = await supabase.rpc('get_hall_actual_occupancy_updated');
        if (error) throw error;
        if (data) {
          return (data as any[]).map((row) => ({
            hall_id: row.hall_id,
            name: row.hall_name ?? row.name ?? '',
            occupancy_percentage: clampPercentage(Number(row.occupancy_percentage ?? 0)),
          }));
        }
      } catch (_) {
        // noop -> fallback
      }

      // Final fallback: compute using active bookings and registration counts
      const { data, error } = await supabase
        .from('halls')
        .select(`
          id,
          name,
          capacity,
          bookings!inner(
            id,
            student_registrations(count)
          )
        `)
        .eq('bookings.status', 'active');

      if (error) throw error;

      const getCount = (sr: any) => {
        if (typeof sr === 'number') return sr;
        if (Array.isArray(sr)) return Number(sr[0]?.count ?? 0);
        if (sr && typeof sr === 'object') return Number(sr.count ?? 0);
        return 0;
      };

      return (data || []).map((hall: any) => {
        const activeBookings = (hall.bookings || []).length;
        const studentsAcrossBookings = (hall.bookings || []).reduce((sum: number, booking: any) => sum + getCount(booking.student_registrations), 0);
        const denom = activeBookings > 0 ? hall.capacity * activeBookings : hall.capacity;
        const percentage = denom > 0 ? (studentsAcrossBookings / denom) * 100 : 0;
        return { hall_id: hall.id, name: hall.name, occupancy_percentage: clampPercentage(Number(percentage.toFixed(1))) };
      });
    },
    staleTime: 30_000,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">لوحة التحكم</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowDiagnostic(!showDiagnostic)}
            variant="outline"
            size="sm"
          >
            {showDiagnostic ? 'Hide' : 'Show'} Diagnostic
          </Button>
          {can('create:registrations') && (
            <Button onClick={() => setIsFastReceptionistOpen(true)}>
              <Plus className="ml-2 h-4 w-4" />
              تسجيل سريع
            </Button>
          )}
        </div>
      </div>

      {showDiagnostic && (
        <AdminDataDiagnostic />
      )}

      <MonthSelector 
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={handleMonthChange}
      />

      <StatsCards selectedMonth={selectedMonth} selectedYear={selectedYear} />

      <HallsGrid occupancyData={occupancyData || []} />

      <FastReceptionistModal 
        isOpen={isFastReceptionistOpen} 
        onClose={() => setIsFastReceptionistOpen(false)} 
      />
    </div>
  );
}
