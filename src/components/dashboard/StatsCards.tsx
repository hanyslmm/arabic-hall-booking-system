
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, GraduationCap, Building, Activity, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { RadialBarChart, RadialBar, AreaChart, Area } from "recharts";

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

  // Prepare mini chart data
  const occupancyValue = typeof stats?.occupancyRatio === 'number' ? stats.occupancyRatio : averageOccupancy;
  const occupancyChartData = [{ name: 'Occupancy', value: Math.max(0, Math.min(100, occupancyValue)) }];

  // Generate a simple weekly breakdown from monthly earnings for visualization only
  const weeklyEarnings = Number(monthlyEarnings || 0);
  const earningsChartData = [
    { name: 'W1', value: Math.round(weeklyEarnings * 0.22) },
    { name: 'W2', value: Math.round(weeklyEarnings * 0.28) },
    { name: 'W3', value: Math.round(weeklyEarnings * 0.25) },
    { name: 'W4', value: Math.round(weeklyEarnings * 0.25) },
  ];

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
      value: `${occupancyValue}%`,
      icon: Activity,
      color: "text-orange-600",
      onClick: () => navigate('/halls'),
      _showRadial: true as const,
    },
    {
      title: isCurrentMonth ? "إيرادات هذا الشهر" : `إيرادات ${getMonthName(selectedMonth)} ${selectedYear}`,
      value: `${Number(monthlyEarnings || 0).toLocaleString()} LE`,
      icon: TrendingUp,
      color: "text-green-600",
      onClick: () => navigate('/reports'),
      _showArea: true as const,
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
            {(!isLoading && (stat as any)._showRadial) && (
              <ChartContainer
                config={{ value: { label: 'النسبة', color: 'hsl(var(--chart-1))' } }}
                className="mt-3 h-20"
              >
                <RadialBarChart data={occupancyChartData} innerRadius={30} outerRadius={38} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" fill="var(--color-value)" cornerRadius={5} />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                </RadialBarChart>
              </ChartContainer>
            )}
            {(!isLoading && (stat as any)._showArea) && (
              <ChartContainer
                config={{ value: { label: 'الإيراد', color: 'hsl(var(--chart-2))' } }}
                className="mt-3 h-20"
              >
                <AreaChart data={earningsChartData} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="var(--color-value)" fill="url(#earningsGradient)" strokeWidth={2} />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                </AreaChart>
              </ChartContainer>
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
