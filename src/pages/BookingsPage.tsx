
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/utils/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, Clock, MapPin, Filter, Hash, Edit, Trash2, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { formatTimeAmPm, formatShortArabicDate } from "@/utils/dateUtils";
import { Button } from "@/components/ui/button";
import { useNavigate, Navigate } from "react-router-dom";
import { EditBookingModal } from "@/components/booking/EditBookingModal";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { MobileResponsiveTable, TableColumn, TableAction } from "@/components/common/MobileResponsiveTable";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Booking {
  id: string;
  start_date: string;
  end_date: string | null;
  start_time: string;
  days_of_week: string[];
  number_of_students: number;
  class_code?: string;
  status: 'active' | 'cancelled' | 'completed';
  created_at: string;
  halls: {
    name: string;
    capacity: number;
  };
  teachers: {
    name: string;
    teacher_code?: string;
  };
  academic_stages: {
    name: string;
  };
  actual_student_count?: number;
}

const BookingsPage = () => {
  const { profile, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [selectedHall, setSelectedHall] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [debugInfo, setDebugInfo] = useState<{
    authState: any;
    profileState: any;
    connectionState: string;
  } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debug authentication and connection state
  useEffect(() => {
    const checkConnectionAndAuth = async () => {
      try {
        // Test Supabase connection
        const { data: connectionTest, error: connectionError } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);
        
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        setDebugInfo({
          authState: {
            user: user ? { id: user.id, email: user.email } : null,
            session: session ? { user_id: session.user?.id } : null,
            sessionError: sessionError?.message,
          },
          profileState: {
            profile: profile ? { 
              id: profile.id, 
              user_role: profile.user_role,
              full_name: profile.full_name 
            } : null,
          },
          connectionState: connectionError ? `Connection Error: ${connectionError.message}` : 'Connected'
        });
      } catch (error) {
        setDebugInfo({
          authState: { error: 'Failed to check auth state' },
          profileState: { error: 'Failed to check profile state' },
          connectionState: `Connection Failed: ${error}`
        });
      }
    };

    checkConnectionAndAuth();
  }, [user, profile]);

  // If not authenticated, redirect to login to avoid RLS errors
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Fetch halls for filter
  const { data: halls } = useQuery({
    queryKey: queryKeys.halls(),
    queryFn: async () => {
      const { data, error } = await supabase.from('halls').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user,
  });

  // Fetch teachers for filter  
  const { data: teachers } = useQuery({
    queryKey: queryKeys.teachers(),
    queryFn: async () => {
      const { data, error } = await supabase.from('teachers').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user,
  });

  // Fetch bookings with actual student count
  const { data: bookings, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.bookingsFiltered(selectedHall, selectedTeacher),
    queryFn: async () => {
      console.log('🔍 Starting bookings query...');
      
      // First, verify authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!session?.user) {
        console.error('❌ No authenticated user found');
        throw new Error('لم يتم العثور على مستخدم مصادق عليه. يرجى تسجيل الدخول مرة أخرى.');
      }
      
      console.log('✅ User authenticated:', session.user.id);
      
      let query = supabase
        .from('bookings')
        .select(`
          *,
          halls(name, capacity),
          teachers(name, teacher_code),
          academic_stages(name)
        `);
      
      if (selectedHall !== 'all') {
        query = query.eq('hall_id', selectedHall);
      }
      
      if (selectedTeacher !== 'all') {
        query = query.eq('teacher_id', selectedTeacher);
      }
      
      console.log('🔍 Executing bookings query with filters:', { selectedHall, selectedTeacher });
      
      const { data: bookingsData, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Bookings query error:', error);
        throw new Error(`خطأ في تحميل الحجوزات: ${error.message} (كود: ${error.code})`);
      }
      
      console.log('✅ Bookings data loaded:', bookingsData?.length || 0, 'records');

      // If no bookings, return early
      if (!bookingsData || bookingsData.length === 0) {
        return [] as (Booking & { actual_student_count: number })[];
      }

      // Batch fetch counts per booking to avoid N+1 queries
      const bookingIds = bookingsData.map((b: any) => b.id);
      const { data: countsRows, error: countsError } = await supabase
        .from('student_registrations')
        .select('booking_id, count:id')
        .in('booking_id', bookingIds)
        .group('booking_id');

      // Build a map of booking_id -> count; fall back to 0 on any error
      const idToCount = new Map<string, number>();
      if (!countsError && Array.isArray(countsRows)) {
        countsRows.forEach((row: any) => {
          const countValue = Number((row as any).count ?? 0);
          idToCount.set(row.booking_id, isNaN(countValue) ? 0 : countValue);
        });
      }

      const enriched = (bookingsData as any[]).map((booking) => ({
        ...booking,
        actual_student_count: idToCount.get(booking.id) ?? 0,
      }));
      
      return enriched as (Booking & { actual_student_count: number })[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  // Delete booking mutation
  const deleteMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
      if (error) throw error;
      return bookingId;
    },
    onSuccess: () => {
      toast({
        title: "تم حذف المجموعة بنجاح",
        description: "تم حذف المجموعة وجميع البيانات المرتبطة بها",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error) => {
      toast({
        title: "خطأ في حذف المجموعة",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Memoize expensive calculations
  const canManage = useMemo(() => 
    profile?.user_role === 'owner' || profile?.user_role === 'manager' || isAdmin,
    [profile?.user_role, isAdmin]
  );

  // Loading timeout guard to avoid infinite spinner on flaky connections
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  useEffect(() => {
    if (isLoading || isFetching) {
      const timerId = setTimeout(() => setLoadingTimedOut(true), 25000); // 25s timeout (less aggressive)
      return () => clearTimeout(timerId);
    }
    setLoadingTimedOut(false);
  }, [isLoading, isFetching]);

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar 
          userRole={profile?.user_role} 
          userName={profile?.full_name || profile?.email || undefined}
          isAdmin={isAdmin}
        />
        <div className="container mx-auto py-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">خطأ في تحميل البيانات</h1>
            <p className="text-muted-foreground mb-6">يرجى المحاولة مرة أخرى</p>
          </div>
          
          {/* Debug Information */}
          {debugInfo && (
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  معلومات التشخيص
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">حالة الاتصال</h4>
                    <div className="flex items-center gap-2">
                      {debugInfo.connectionState.includes('Error') || debugInfo.connectionState.includes('Failed') ? 
                        <WifiOff className="h-4 w-4 text-destructive" /> : 
                        <Wifi className="h-4 w-4 text-green-600" />
                      }
                      <span className="text-xs">{debugInfo.connectionState}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">حالة المصادقة</h4>
                    <div className="text-xs space-y-1">
                      <div>المستخدم: {debugInfo.authState.user ? '✅ متصل' : '❌ غير متصل'}</div>
                      <div>الجلسة: {debugInfo.authState.session ? '✅ نشطة' : '❌ غير نشطة'}</div>
                      {debugInfo.authState.sessionError && (
                        <div className="text-destructive">خطأ الجلسة: {debugInfo.authState.sessionError}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">معلومات الملف الشخصي</h4>
                    <div className="text-xs space-y-1">
                      <div>الملف الشخصي: {debugInfo.profileState.profile ? '✅ محمل' : '❌ غير محمل'}</div>
                      {debugInfo.profileState.profile && (
                        <div>الصلاحية: {debugInfo.profileState.profile.user_role || 'غير محددة'}</div>
                      )}
                    </div>
                  </div>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>خطأ تفصيلي:</strong> {error?.message || 'خطأ غير معروف'}
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => refetch()} variant="outline">
                    إعادة تحميل البيانات
                  </Button>
                  <Button onClick={() => navigate('/login')} variant="outline">
                    تسجيل الدخول مرة أخرى
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">نشط</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">ملغي</Badge>;
      case 'completed':
        return <Badge variant="secondary">مكتمل</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDaysInArabic = (days: string[]) => {
    const dayMap: Record<string, string> = {
      'sunday': 'الأحد',
      'monday': 'الإثنين',
      'tuesday': 'الثلاثاء',
      'wednesday': 'الأربعاء',
      'thursday': 'الخميس',
      'friday': 'الجمعة',
      'saturday': 'السبت'
    };
    return days.map(day => dayMap[day] || day).join(', ');
  };

  // Define table columns with mobile optimization
  const bookingColumns: TableColumn<Booking>[] = [
    {
      key: 'class_code',
      header: 'كود المجموعة',
      mobileLabel: 'الكود',
      render: (booking) => (
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-primary sm:inline hidden" />
          <span className="font-mono text-sm bg-primary/10 px-2 py-1 rounded">
            {booking.class_code || 'غير محدد'}
          </span>
        </div>
      ),
    },
    {
      key: 'academic_stage',
      header: 'المرحلة الدراسية',
      mobileLabel: 'المرحلة',
      render: (booking) => (
        <span className="font-medium text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
          {booking.academic_stages.name}
        </span>
      ),
    },
    {
      key: 'hall',
      header: 'القاعة',
      mobileLabel: 'القاعة',
      render: (booking) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground sm:inline hidden" />
          <div className="flex flex-col">
            <span className="font-medium">{booking.halls.name}</span>
            <span className="text-xs text-muted-foreground">سعة: {booking.halls.capacity}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'teacher',
      header: 'المعلم',
      mobileLabel: 'المعلم',
      render: (booking) => (
        <div className="flex flex-col">
          <span className="font-medium">{booking.teachers.name}</span>
          {booking.teachers.teacher_code && (
            <span className="text-xs bg-secondary px-1 py-0.5 rounded w-fit">
              {booking.teachers.teacher_code}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'time_days',
      header: 'التوقيت والأيام',
      mobileLabel: 'التوقيت',
      hideOnMobile: true, // Hide on mobile, will show in expanded content
      render: (booking) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatTimeAmPm(booking.start_time)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {getDaysInArabic(booking.days_of_week)}
          </div>
        </div>
      ),
    },
    {
      key: 'student_count',
      header: 'عدد الطلاب',
      mobileLabel: 'الطلاب',
      render: (booking) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground sm:inline hidden" />
          <div className="flex flex-col items-start sm:items-center">
            <span className="font-semibold text-primary text-lg">
              {booking.actual_student_count || 0}
            </span>
            <span className="text-xs text-muted-foreground">
              من {booking.number_of_students}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'التواريخ',
      mobileLabel: 'البداية',
      render: (booking) => (
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-green-600 sm:inline hidden" />
            <span className="text-xs">{formatShortArabicDate(booking.start_date)}</span>
          </div>
          {booking.end_date && (
            <div className="flex items-center gap-1 sm:block hidden">
              <Calendar className="h-3 w-3 text-red-600" />
              <span className="text-xs">النهاية: {formatShortArabicDate(booking.end_date)}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      mobileLabel: 'الحالة',
      render: (booking) => getStatusBadge(booking.status),
    },
  ];

  // Render expanded content for each booking
  const renderExpandedBookingContent = (booking: Booking) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
      <div className="space-y-2">
        <h4 className="font-semibold text-sm">تفاصيل المجموعة</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">التوقيت:</span>
            <span>{formatTimeAmPm(booking.start_time)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">الأيام:</span>
            <span className="text-xs">{getDaysInArabic(booking.days_of_week)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">سعة القاعة:</span>
            <span>{booking.halls.capacity} طالب</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <h4 className="font-semibold text-sm">التواريخ</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">تاريخ البداية:</span>
            <span>{formatShortArabicDate(booking.start_date)}</span>
          </div>
          {booking.end_date && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">تاريخ النهاية:</span>
              <span>{formatShortArabicDate(booking.end_date)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">تاريخ الإنشاء:</span>
            <span>{formatShortArabicDate(booking.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-sm">الإجراءات</h4>
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            onClick={() => navigate(`/class-management/${booking.id}`)}
            className="bg-primary hover:bg-primary/90 justify-start"
          >
            إدارة المجموعة
          </Button>
          {canManage && (
            <>
              <div data-booking-id={booking.id}>
                <EditBookingModal 
                  bookingId={booking.id} 
                  booking={booking} 
                />
              </div>
              <div data-delete-booking-id={booking.id}>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deleteMutation.isPending}
                      className="justify-start"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      حذف المجموعة
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>حذف المجموعة</AlertDialogTitle>
                      <AlertDialogDescription>
                        هل أنت متأكد من حذف مجموعة "{booking.class_code}"؟ 
                        سيتم حذف جميع البيانات المرتبطة بها بما في ذلك تسجيلات الطلاب والمدفوعات.
                        هذا الإجراء لا يمكن التراجع عنه.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(booking.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        حذف المجموعة
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        userRole={profile?.user_role} 
        userName={profile?.full_name || profile?.email || undefined}
        isAdmin={isAdmin}
      />
      
      <main className="container mx-auto p-4 pt-20 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">إدارة المجموعات</h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              عرض وإدارة المجموعات الدراسية والطلاب المسجلين بها
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="font-semibold">{bookings?.length || 0} مجموعة</span>
            </div>
            {canManage && (
              <Button onClick={() => navigate('/booking')} className="w-full sm:w-auto">
                إضافة مجموعة جديدة
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
              فلترة النتائج
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">القاعة</label>
                <Select value={selectedHall} onValueChange={setSelectedHall}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="جميع القاعات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع القاعات</SelectItem>
                    {halls?.map((hall) => (
                      <SelectItem key={hall.id} value={hall.id}>
                        {hall.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">المعلم</label>
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="جميع المعلمين" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المعلمين</SelectItem>
                    {teachers?.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error or stalled loading state */}
        {(error || loadingTimedOut) ? (
          <Card>
            <CardHeader>
              <CardTitle>تعذر تحميل قائمة المجموعات الدراسية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-muted-foreground">
                  {error ? 'حدث خطأ أثناء جلب البيانات. يرجى المحاولة مرة أخرى.' : 'يستغرق التحميل وقتًا أطول من المتوقع. تحقق من الاتصال بالإنترنت ثم أعد المحاولة.'}
                </p>
                <Button onClick={() => refetch()} className="w-full sm:w-auto">إعادة المحاولة</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <MobileResponsiveTable
            data={bookings || []}
            columns={bookingColumns}
            title="قائمة المجموعات الدراسية"
            isLoading={isLoading}
            emptyMessage="لم يتم إنشاء أي مجموعات بعد"
            emptyIcon={<Users className="h-16 w-16 mx-auto text-muted-foreground" />}
            getRowKey={(booking) => booking.id}
            expandedContent={renderExpandedBookingContent}
            itemsPerPage={50}
          />
        )}
      </main>
    </div>
  );
};

export default BookingsPage;
