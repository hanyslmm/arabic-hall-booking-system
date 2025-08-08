
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UnifiedLayout } from "@/components/layout/UnifiedLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { CardDescription } from "@/components/ui/card";

interface BookingFinancialData {
  id: string;
  start_date: string;
  class_fees: number;
  number_of_students: number;
  halls: { name: string } | null;
  teachers: { name: string } | null;
  created_at: string;
}

interface DashboardStats {
  totalBookings: number;
  activeBookings: number;
  totalTeachers: number;
  totalHalls: number;
}

export function ReportsPage() {
  const { user, isAdmin, isOwner, canManageUsers, loading } = useAuth();

  const hasAdminAccess = isAdmin || isOwner || canManageUsers;

  if (loading) {
    return (
      <UnifiedLayout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner />
        </div>
      </UnifiedLayout>
    );
  }

  if (!user || !hasAdminAccess) {
    return <Navigate to="/login" replace />;
  }

  // Fetch dashboard statistics
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [bookingsRes, teachersRes, hallsRes] = await Promise.all([
        supabase.from('bookings').select('id, status'),
        supabase.from('teachers').select('id'),
        supabase.from('halls').select('id')
      ]);

      const totalBookings = bookingsRes.data?.length || 0;
      const activeBookings = bookingsRes.data?.filter(b => b.status === 'active').length || 0;
      const totalTeachers = teachersRes.data?.length || 0;
      const totalHalls = hallsRes.data?.length || 0;

      return {
        totalBookings,
        activeBookings,
        totalTeachers,
        totalHalls
      } as DashboardStats;
    }
  });

  // Fetch all bookings with financial data
  const reportsQuery = useQuery({
    queryKey: ['bookings-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, start_date, class_fees, is_custom_fee, number_of_students, halls(name), teachers(name)')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data as any[];
    }
  });

  // Calculate total revenue
  const totalRevenue = reportsQuery.data?.reduce((sum, booking) => sum + (booking.class_fees || 0), 0) || 0;


  if (reportsQuery.isLoading) {
    return (
      <UnifiedLayout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner />
        </div>
      </UnifiedLayout>
    );
  }

  return (
    <UnifiedLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">التقارير المالية</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">إجمالي الإيرادات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {totalRevenue.toLocaleString()} جنيه
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                من جميع الحجوزات
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">عدد الحجوزات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {reportsQuery.data?.length || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                إجمالي الحجوزات
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">متوسط قيمة الحجز</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {reportsQuery.data?.length ? Math.round(totalRevenue / reportsQuery.data.length).toLocaleString() : 0} جنيه
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                للحجز الواحد
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>تقرير مفصل بالحجوزات</CardTitle>
            <CardDescription>
              جميع الحجوزات مع تفاصيل الأسعار
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>القاعة</TableHead>
                    <TableHead>المعلم</TableHead>
                    <TableHead>المادة</TableHead>
                    <TableHead>عدد الطلاب</TableHead>
                    <TableHead>السعر</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportsQuery.data?.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        {format(new Date(booking.start_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{booking.halls?.name}</TableCell>
                      <TableCell>{booking.teachers?.name}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{booking.number_of_students || 0}</TableCell>
                      <TableCell className="font-semibold">
                        {(booking.class_fees || 0).toLocaleString()} جنيه {booking.is_custom_fee ? '(مخصص)' : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {reportsQuery.data?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">لا توجد حجوزات</h3>
                <p>لم يتم إنشاء أي حجوزات بعد</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UnifiedLayout>
  );
}
