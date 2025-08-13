import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
// Removed internal Navbar; outer layout provides it
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { MonthSelector } from "@/components/dashboard/MonthSelector";
import { teacherAuthApi, TeacherStatistics } from "@/api/teacher-auth";
import { Users, BookOpen, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { formatShortArabicDate } from "@/utils/dateUtils";

const TeacherDashboard = () => {
  const { profile } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  // Get teacher statistics
  const teacherId = profile?.teacher_id;
  const { data: statistics, isLoading: statsLoading } = useQuery({
    queryKey: ['teacher-statistics', teacherId, selectedMonth, selectedYear],
    queryFn: async () => {
      if (!teacherId) throw new Error('Missing teacherId');
      return teacherAuthApi.getStatistics(teacherId);
    },
    enabled: !!teacherId && profile?.user_role === 'teacher'
  });

  // Get teacher bookings - now passing teacher_id
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['teacher-bookings', teacherId],
    queryFn: async () => {
      if (!teacherId) throw new Error('Missing teacherId');
      return teacherAuthApi.getMyBookings(teacherId);
    },
    enabled: !!teacherId && profile?.user_role === 'teacher'
  });

  // Get student registrations - now passing teacher_id
  const { data: registrations, isLoading: registrationsLoading } = useQuery({
    queryKey: ['teacher-registrations', teacherId],
    queryFn: async () => {
      if (!teacherId) throw new Error('Missing teacherId');
      return teacherAuthApi.getMyStudentRegistrations(teacherId);
    },
    enabled: !!teacherId && profile?.user_role === 'teacher'
  });

  if (profile?.user_role !== 'teacher') {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">غير مصرح لك بالوصول لهذه الصفحة</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (statsLoading || bookingsLoading || registrationsLoading) {
    return (
      <div className="p-4">
        <LoadingSpinner />
      </div>
    );
  }

  const stats: TeacherStatistics = statistics || {
    total_students: 0,
    total_classes: 0,
    total_earnings: 0,
    monthly_earnings: 0,
    pending_payments: 0,
    attendance_rate: 0
  };

  const getMonthName = (month: number) => {
    const monthNames = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return monthNames[month - 1] || 'غير محدد';
  };

  const isCurrentMonth = selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear();

  const isInSelectedMonth = (dateString?: string | null) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
  };

  const totalRegistrations = (registrations?.length || 0);
  const paidRegistrationsThisMonth = (registrations || []).filter((reg: any) =>
    (reg.payment_records || []).some((rec: any) => isInSelectedMonth(rec.payment_date))
  ).length;
  const paymentRate = totalRegistrations > 0 ? (paidRegistrationsThisMonth / totalRegistrations) * 100 : 0;

  return (
    <div className="p-4 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              لوحة تحكم المعلم
            </h1>
            <p className="text-muted-foreground mt-2">
              مرحباً {profile?.full_name || 'معلم'} - إليك إحصائياتك وبياناتك
            </p>
          </div>
        </div>

        <MonthSelector 
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={handleMonthChange}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الطلاب</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_students}</div>
              <p className="text-xs text-muted-foreground">طالب مسجل</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الفصول النشطة</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_classes}</div>
              <p className="text-xs text-muted-foreground">فصل نشط</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify_between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isCurrentMonth ? "الايراد الشهري" : `ايراد ${getMonthName(selectedMonth)} ${selectedYear}`}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthly_earnings.toLocaleString()} ج.م</div>
              <p className="text-xs text-muted-foreground">
                {isCurrentMonth ? "هذا الشهر" : "للشهر المحدد"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المدفوعات المعلقة</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending_payments}</div>
              <p className="text-xs text-muted-foreground">طالب متأخر</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">معدل الدفع</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paymentRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">{isCurrentMonth ? "هذا الشهر" : "للشهر المحدد"}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>فصولي الدراسية</CardTitle>
            <CardDescription>
              جميع الفصول المسجلة لك
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bookings && bookings.length > 0 ? (
              <div className="space-y-3">
                {bookings.map((booking: any) => {
                  const regsForBooking = (registrations || []).filter((r: any) => r.booking_id === booking.id);
                  const totalForClass = regsForBooking.length;
                  const paidForClass = regsForBooking.filter((r: any) => (r.payment_records || []).some((rec: any) => isInSelectedMonth(rec.payment_date))).length;
                  const classRate = totalForClass > 0 ? (paidForClass / totalForClass) * 100 : 0;

                  const unpaidCount = regsForBooking.filter((r: any) => {
                    const hasPaymentThisMonth = (r.payment_records || []).some((rec: any) => isInSelectedMonth(rec.payment_date));
                    return !hasPaymentThisMonth;
                  }).length;

                  return (
                    <div key={booking.id} className="flex flex-col gap-3 p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">{booking.class_code}</div>
                          <div className="text-sm text-muted-foreground">القاعة: {booking.halls?.name || 'غير محدد'}</div>
                          <div className="text-sm text-muted-foreground">الوقت: {booking.start_time} - الأيام: {booking.days_of_week?.join(', ')}</div>
                        </div>
                        <div className="text-left">
                          <Badge variant={booking.status === 'active' ? 'default' : 'secondary'}>
                            {booking.status === 'active' ? 'نشط' : 'غير نشط'}
                          </Badge>
                          <div className="text-sm text-muted-foreground mt-1">{booking.number_of_students} طالب</div>
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">نسبة الدفع</span>
                          <span className="font-semibold">{classRate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min(classRate, 100)}%` }} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">غير مدفوع: {unpaidCount} طالب</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">لا توجد فصول مسجلة</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>التسجيلات الحديثة</CardTitle>
            <CardDescription>
              آخر الطلاب المسجلين في فصولك
            </CardDescription>
          </CardHeader>
          <CardContent>
            {registrations && registrations.length > 0 ? (
              <div className="space-y-3">
                {registrations.slice(0, 10).map((reg: any) => (
                  <div key={reg.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">{reg.students?.name}</div>
                      <div className="text-sm text-muted-foreground">الهاتف: {reg.students?.mobile_phone}</div>
                      <div className="text-sm text-muted-foreground">الرقم التسلسلي: {reg.students?.serial_number}</div>
                    </div>
                    <div className="text-left">
                      <Badge variant={
                        reg.payment_status === 'paid' ? 'default' :
                        reg.payment_status === 'partial' ? 'secondary' : 'destructive'
                      }>
                        {reg.payment_status === 'paid' ? 'مدفوع' :
                         reg.payment_status === 'partial' ? 'مدفوع جزئياً' : 'معلق'}
                      </Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        {formatShortArabicDate(reg.registration_date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">لا توجد تسجيلات</p>
            )}
          </CardContent>
        </Card>
    </div>
  );
};

export default TeacherDashboard;