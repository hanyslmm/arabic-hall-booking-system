import { useAuth } from "@/hooks/useAuth";

import { UnifiedLayout } from "@/components/layout/UnifiedLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { MonthSelector } from "@/components/dashboard/MonthSelector";
import { HallsGrid } from "@/components/dashboard/HallsGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { FastReceptionistModal } from "@/components/receptionist/FastReceptionistModal";

const Index = () => {
  const { user, loading, profile } = useAuth();
  const [hasError, setHasError] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isFastReceptionistOpen, setIsFastReceptionistOpen] = useState(false);
  
  console.log('Index component rendering...', { user: !!user, loading });

  // Local permission helper to align with `can('create:registrations')`
  const can = (permission: string) => {
    if (permission === 'create:registrations') {
      // Allow all non-teacher roles (consistent with registrations page)
      return profile?.user_role !== 'teacher';
    }
    return false;
  };

  useEffect(() => {
    // Add error boundary logic
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    
    return () => window.removeEventListener('error', handleError);
  }, []);

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">حدث خطأ غير متوقع</h1>
          <p className="text-muted-foreground mb-4">يرجى تحديث الصفحة والمحاولة مرة أخرى</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            تحديث الصفحة
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('No user, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  console.log('User authenticated, showing dashboard');
  
  // Teachers get their own dashboard through UnifiedLayout, so return empty content
  if (profile?.user_role === 'teacher') {
    return <UnifiedLayout><div /></UnifiedLayout>;
  }
  
  return (
    <UnifiedLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold">لوحة التحكم</h1>
          {can('create:registrations') && (
            <Button onClick={() => setIsFastReceptionistOpen(true)}>
              <Plus className="ml-2 h-4 w-4" />
              تسجيل سريع
            </Button>
          )}
        </div>

        <MonthSelector 
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={handleMonthChange}
        />

        <StatsCards 
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />

        <HallsGrid />

        <FastReceptionistModal 
          isOpen={isFastReceptionistOpen} 
          onClose={() => setIsFastReceptionistOpen(false)} 
        />
      </div>
    </UnifiedLayout>
  );
};

export default Index;