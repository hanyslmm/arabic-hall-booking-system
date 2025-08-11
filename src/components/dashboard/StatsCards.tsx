
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, GraduationCap, Building, Activity, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface StatsCardsProps {
  averageOccupancy?: number;
  timeSlotAvailability?: number;
  totalSlots?: number;
  bookedSlots?: number;
  selectedMonth?: number;
  selectedYear?: number;
}

export const StatsCards = ({ 
  averageOccupancy = 0, 
  timeSlotAvailability = 0,
  totalSlots = 0,
  bookedSlots = 0,
  selectedMonth = new Date().getMonth() + 1,
  selectedYear = new Date().getFullYear()
}: StatsCardsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id, selectedMonth, selectedYear],
    queryFn: async () => {
      const [
        { count: hallsCount, error: hallsError },
        { count: teachersCount, error: teachersError },
        { count: stagesCount, error: stagesError },
        { count: bookingsCount, error: bookingsError },
        actualOccupancyData
      ] = await Promise.all([
        supabase.from('halls').select('*', { count: 'exact', head: true }),
        supabase.from('teachers').select('*', { count: 'exact', head: true }),
        supabase.from('academic_stages').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.rpc('get_hall_actual_occupancy_updated')
      ]);

      if (hallsError) throw hallsError;
      if (teachersError) throw teachersError;
      if (stagesError) throw stagesError;
      if (bookingsError) throw bookingsError;

      // Calculate average occupancy based on actual student registrations
      const avgOccupancy = actualOccupancyData.data && actualOccupancyData.data.length > 0 
        ? Math.round(actualOccupancyData.data.reduce((sum: number, hall: any) => sum + hall.occupancy_percentage, 0) / actualOccupancyData.data.length)
        : 0;

      return {
        halls: hallsCount || 0,
        teachers: teachersCount || 0,
        stages: stagesCount || 0,
        activeBookings: bookingsCount || 0,
        occupancyRatio: avgOccupancy
      };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Monthly earnings with selected month/year support
  const { data: monthlyEarnings } = useQuery({
    queryKey: ['monthly-earnings', user?.id, selectedMonth, selectedYear],
    queryFn: async () => {
      const { fetchMonthlyEarnings } = await import('@/utils/finance');
      return await fetchMonthlyEarnings(selectedMonth, selectedYear);
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Get month name in Arabic
  const getMonthName = (month: number) => {
    const monthNames = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return monthNames[month - 1] || 'غير محدد';
  };

  const isCurrentMonth = selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear();

  const statsData = [
    {
      title: "إجمالي القاعات",
      value: stats?.halls || 0,
      icon: Building,
      color: "text-primary",
      onClick: () => navigate('/halls')
    },
    {
      title: "المعلمين",
      value: stats?.teachers || 0,
      icon: GraduationCap,
      color: "text-success",
      onClick: () => navigate('/teachers')
    },
    {
      title: "المراحل الدراسية",
      value: stats?.stages || 0,
      icon: Users,
      color: "text-warning",
      onClick: () => navigate('/stages')
    },
    {
      title: "الحجوزات النشطة",
      value: stats?.activeBookings || 0,
      icon: Calendar,
      color: "text-destructive",
      onClick: () => navigate('/bookings')
    },
    {
      title: "نسبة الاشغال",
      value: `${averageOccupancy}%`,
      icon: Activity,
      color: "text-orange-600",
      onClick: () => navigate('/halls')
    },
    {
      title: isCurrentMonth ? "إيرادات هذا الشهر" : `إيرادات ${getMonthName(selectedMonth)} ${selectedYear}`,
      value: `${Number(monthlyEarnings || 0).toLocaleString()} LE`,
      icon: TrendingUp,
      color: "text-green-600",
      onClick: () => navigate('/reports')
    },
    {
      title: "إشغال الفترات الزمنية",
      value: `${timeSlotAvailability}%`,
      icon: Calendar,
      color: "text-blue-600",
      description: `${bookedSlots} من ${totalSlots} فترة محجوزة`,
      onClick: () => navigate('/bookings')
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {statsData.map((stat, index) => (
        <Card 
          key={index} 
          className="card-elevated cursor-pointer hover:shadow-lg transition-shadow"
          onClick={stat.onClick}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stat.value}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description || "انقر للعرض التفصيلي"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
