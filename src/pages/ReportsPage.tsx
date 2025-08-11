
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { fetchMonthlyEarnings } from "@/utils/finance";

interface BookingFinancialData {
  id: string;
  start_date: string;
  class_fees: number;
  number_of_students: number;
  halls: { name: string } | null;
  teachers: { name: string } | null;
  created_at: string;
}

export function ReportsPage() {
  const { user, isAdmin, isOwner, canManageUsers, loading } = useAuth();

  const hasAdminAccess = isAdmin || isOwner || canManageUsers;
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<string>('all');

  if (loading) {
    return (
      <UnifiedLayout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner />
        </div>
      </UnifiedLayout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!hasAdminAccess) {
    return <Navigate to="/" replace />;
  }

  // Current month date range for filtering and totals
  const { startDate, endDateExclusive } = useMemo(() => {
    const now = new Date();
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDateExclusive: new Date(now.getFullYear(), now.getMonth() + 1, 1)
    };
  }, []);

  const isInCurrentMonth = useMemo(() => {
    const start = startDate.getTime();
    const end = endDateExclusive.getTime();
    return (dateString?: string | null) => {
      if (!dateString) return false;
      const t = new Date(dateString).getTime();
      return t >= start && t < end;
    };
  }, [startDate, endDateExclusive]);

  // Fetch all bookings with basic data for filters and table
  const reportsQuery = useQuery({
    queryKey: ['bookings-report', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, start_date, class_code, teacher_id, class_fees, is_custom_fee, number_of_students, halls(name), teachers(name)')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Fetch teachers for filter
  const { data: teachers } = useQuery({
    queryKey: ['teachers-list', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('teachers').select('id, name').order('name');
      if (error) throw error;
      return data as Array<{ id: string; name: string }>;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Apply filters to bookings
  const filteredBookings = useMemo(() => {
    let items = reportsQuery.data || [];
    if (selectedTeacher !== 'all') {
      items = items.filter(b => b.teacher_id === selectedTeacher);
    }
    if (selectedBooking !== 'all') {
      items = items.filter(b => b.id === selectedBooking);
    }
    return items;
  }, [reportsQuery.data, selectedTeacher, selectedBooking]);

  const filteredBookingIds = useMemo(() => (filteredBookings || []).map((b: any) => b.id), [filteredBookings]);

  // Fetch registrations with payment records only for filtered bookings
  const { data: registrations } = useQuery({
    queryKey: ['registrations-with-payments', user?.id, filteredBookingIds],
    queryFn: async () => {
      if (!filteredBookingIds || filteredBookingIds.length === 0) return [] as Array<{ id: string; booking_id: string; total_fees: number; payment_records: Array<{ amount: number; payment_date: string }>; }>;
      const { data, error } = await supabase
        .from('student_registrations')
        .select('id, booking_id, total_fees, payment_records(amount, payment_date)')
        .in('booking_id', filteredBookingIds);
      if (error) throw error;
      return data as Array<{ id: string; booking_id: string; total_fees: number; payment_records: Array<{ amount: number; payment_date: string }>; }>;
    },
    enabled: !!user && filteredBookingIds.length > 0,
    staleTime: 30_000,
  });

  // Server-side monthly total using RPC through util (matches home page logic)
  const { data: monthlyCollected = 0, isLoading: isLoadingMonthlyTotal } = useQuery({
    queryKey: ['monthly-collected-total'],
    queryFn: () => fetchMonthlyEarnings(),
  });

  // Build payment sum per booking, limited to current month
  const { averageBookingValue, perBookingCollected } = useMemo(() => {
    const perBooking = new Map<string, number>();
    for (const reg of registrations || []) {
      const collectedForRegThisMonth = (reg.payment_records || [])
        .filter((r) => isInCurrentMonth(r.payment_date))
        .reduce((s, r) => s + Number(r.amount || 0), 0);
      if (collectedForRegThisMonth > 0) {
        perBooking.set(reg.booking_id, (perBooking.get(reg.booking_id) || 0) + collectedForRegThisMonth);
      }
    }
    const count = filteredBookings?.length || 0;
    const total = Array.from(perBooking.values()).reduce((a, b) => a + b, 0);
    const avg = count > 0 ? Math.round(total / count) : 0;
    return { averageBookingValue: avg, perBookingCollected: perBooking };
  }, [registrations, filteredBookings, isInCurrentMonth]);


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

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>فلاتر التقرير</CardTitle>
            <CardDescription>تصفية البيانات حسب المعلم أو الصف</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">المعلم</label>
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المعلم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {teachers?.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">المجموعة</label>
                <Select value={selectedBooking} onValueChange={setSelectedBooking}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المجموعة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {reportsQuery.data?.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.class_code || b.id.slice(0,8)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Export CSV of filtered data with per-booking collected (current month)
                    const rows = (filteredBookings || []).map(b => {
                      const collected = perBookingCollected.get(b.id) || 0;
                      return {
                        date: format(new Date(b.start_date), 'yyyy-MM-dd'),
                        hall: b.halls?.name || '-',
                        teacher: b.teachers?.name || '-',
                        class_code: b.class_code || '-',
                        students: b.number_of_students || 0,
                        collected,
                      };
                    });
                    const headers = ['date','hall','teacher','class_code','students','collected'];
                    const csv = [headers.join(','), ...rows.map(r => headers.map(h => String((r as any)[h] ?? '')).join(','))].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'financial_report.csv';
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  تصدير CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">إجمالي الإيرادات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {isLoadingMonthlyTotal ? '...' : Number(monthlyCollected || 0).toLocaleString()} جنيه
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                هذا الشهر
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">عدد الحجوزات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {filteredBookings?.length || 0}
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
                {averageBookingValue.toLocaleString()} جنيه
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                هذا الشهر
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
                    <TableHead>الكود</TableHead>
                    <TableHead>عدد الطلاب</TableHead>
                    <TableHead>المحصل (هذا الشهر)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings?.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        {format(new Date(booking.start_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>{booking.halls?.name}</TableCell>
                      <TableCell>{booking.teachers?.name}</TableCell>
                      <TableCell>{booking.class_code || '-'}</TableCell>
                      <TableCell>{booking.number_of_students || 0}</TableCell>
                      <TableCell className="font-semibold">
                        {Number(perBookingCollected.get(booking.id) || 0).toLocaleString()} جنيه
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredBookings?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <h3 className="text-lg font_medium mb-2">لا توجد حجوزات</h3>
                <p>لم يتم إنشاء أي حجوزات بعد</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UnifiedLayout>
  );
}
