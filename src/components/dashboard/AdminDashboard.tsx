import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { FastReceptionistModal } from "@/components/receptionist/FastReceptionistModal";
import StatsCards from "@/components/dashboard/StatsCards";
import { MonthSelector } from "@/components/dashboard/MonthSelector";
import { HallsGrid } from "@/components/dashboard/HallsGrid";
import { useAuth } from "@/hooks/useAuth";
import { AdminDataDiagnostic } from "@/components/AdminDataDiagnostic";

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

      <HallsGrid />

      <FastReceptionistModal 
        isOpen={isFastReceptionistOpen} 
        onClose={() => setIsFastReceptionistOpen(false)} 
      />
    </div>
  );
}
