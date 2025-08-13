
import { useQueries } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Calendar, UserCheck } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { getStudents } from '@/api/students';
import { getTeachers } from '@/api/teachers';
import { getBookings } from '@/api/bookings';

const StatsCards = () => {
  const results = useQueries({
    queries: [
      { queryKey: ['students'], queryFn: getStudents },
      { queryKey: ['teachers'], queryFn: getTeachers },
      { queryKey: ['bookings'], queryFn: getBookings },
    ],
  });

  const isLoading = results.some(q => q.isLoading);
  const isError = results.some(q => q.isError);

  const students = results[0].data || [];
  const teachers = results[1].data || [];
  const bookings = results[2].data || [];

  const totalRevenue = bookings.reduce((acc, booking) => acc + Number((booking as any).class_fees || 0), 0);
  
  const today = new Date().toISOString().split('T')[0];
  const todaysBookings = bookings.filter(b => (b as any).start_time?.startsWith?.(today) || (b as any).start_date === today).length;

  const stats = [
    { title: "إجمالي الإيرادات", value: `EGP ${totalRevenue.toLocaleString()}`, icon: DollarSign, description: "هذا الشهر" },
    { title: "إجمالي الطلاب", value: students.length, icon: Users, description: "كل الطلاب المسجلين" },
    { title: "إجمالي المدرسين", value: teachers.length, icon: UserCheck, description: "كل المدرسين النشطين" },
    { title: "حجوزات اليوم", value: todaysBookings, icon: Calendar, description: "الحجوزات المجدولة اليوم" }
  ];

  if (isError) {
    return <div className="text-red-500">حدث خطأ أثناء تحميل الإحصائيات.</div>;
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {isLoading ? (
        Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-6" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-4 w-40" />
            </CardContent>
          </Card>
        ))
      ) : (
        stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default StatsCards;
