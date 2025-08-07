import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { RegisterStudentModal } from "@/components/student/RegisterStudentModal";
import { FastRegistrationModal } from "@/components/student/FastRegistrationModal";
import { studentRegistrationsApi, StudentRegistration } from "@/api/students";
import { Plus, Search, UserCheck, GraduationCap, DollarSign, Calendar, Trash2, Scan } from "lucide-react";
import { toast } from "sonner";
import { formatTimeAmPm, formatShortArabicDate } from "@/utils/dateUtils";

const StudentRegistrationsPage = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showRegisterStudent, setShowRegisterStudent] = useState(false);
  const [showFastRegistration, setShowFastRegistration] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("");

  const { data: registrations = [], isLoading, error } = useQuery({
    queryKey: ["student-registrations"],
    queryFn: studentRegistrationsApi.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: studentRegistrationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-registrations"] });
      toast.success("تم حذف التسجيل بنجاح");
    },
    onError: () => {
      toast.error("فشل في حذف التسجيل");
    }
  });

  // Filter registrations based on booking and payment status
  const filteredRegistrations = registrations.filter(reg => {
    const bookingMatch = selectedBooking === "all" || !selectedBooking || reg.booking_id === selectedBooking;
    const paymentMatch = paymentFilter === "all" || !paymentFilter || reg.payment_status === paymentFilter;
    return bookingMatch && paymentMatch;
  });

  // Get unique bookings for filter
  const uniqueBookings = Array.from(
    new Set(registrations.map(reg => reg.booking_id))
  ).map(bookingId => {
    const reg = registrations.find(r => r.booking_id === bookingId);
    return {
      id: bookingId,
      label: `${reg?.booking?.halls?.name} - ${reg?.booking?.teachers?.name} - ${reg?.booking?.academic_stages?.name}`
    };
  });

  const getPaymentStatusBadge = (status: string) => {
    const statusMap = {
      'pending': { variant: 'destructive' as const, label: 'لم يدفع' },
      'partial': { variant: 'secondary' as const, label: 'دفع جزئي' },
      'paid': { variant: 'default' as const, label: 'مدفوع' },
    };
    
    const config = statusMap[status as keyof typeof statusMap] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDaysInArabic = (days: string[]) => {
    const daysMap: { [key: string]: string } = {
      'sunday': 'الأحد',
      'monday': 'الاثنين',
      'tuesday': 'الثلاثاء',
      'wednesday': 'الأربعاء',
      'thursday': 'الخميس',
      'friday': 'الجمعة',
      'saturday': 'السبت'
    };
    return days.map(day => daysMap[day]).join(', ');
  };

  const canManageRegistrations = profile?.role === 'ADMIN' || 
    (profile?.user_role && ['owner', 'manager'].includes(profile.user_role));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar 
          userRole={profile?.user_role} 
          userName={profile?.full_name || profile?.email || undefined}
        />
        <div className="container mx-auto p-4 pt-20">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar 
          userRole={profile?.user_role} 
          userName={profile?.full_name || profile?.email || undefined}
        />
        <div className="container mx-auto p-4 pt-20">
          <Card>
            <CardContent className="p-6">
              <p className="text-destructive">خطأ في تحميل بيانات التسجيلات</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        userRole={profile?.user_role} 
        userName={profile?.full_name || profile?.email || undefined}
      />
      
      <main className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
              <UserCheck className="h-6 w-6 sm:h-8 sm:w-8" />
              تسجيلات الطلاب
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              إدارة تسجيل الطلاب في الدورات والقاعات
            </p>
          </div>
          
          {canManageRegistrations && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setShowFastRegistration(true)}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 w-full sm:w-auto"
              >
                <Scan className="h-4 w-4" />
                التسجيل السريع
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRegisterStudent(true)}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                تسجيل طالب جديد
              </Button>
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي التسجيلات</p>
                  <p className="text-2xl font-bold">{registrations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">مدفوع بالكامل</p>
                  <p className="text-2xl font-bold">
                    {registrations.filter(r => r.payment_status === 'paid').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">دفع جزئي</p>
                  <p className="text-2xl font-bold">
                    {registrations.filter(r => r.payment_status === 'partial').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-muted-foreground">لم يدفع</p>
                  <p className="text-2xl font-bold">
                    {registrations.filter(r => r.payment_status === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>فلترة النتائج</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">الدورة</label>
                <Select value={selectedBooking} onValueChange={setSelectedBooking}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الدورات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الدورات</SelectItem>
                    {uniqueBookings.map((booking) => (
                      <SelectItem key={booking.id} value={booking.id}>
                        {booking.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">حالة الدفع</label>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="pending">لم يدفع</SelectItem>
                    <SelectItem value="partial">دفع جزئي</SelectItem>
                    <SelectItem value="paid">مدفوع</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registrations Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة التسجيلات ({filteredRegistrations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRegistrations.length === 0 ? (
              <div className="text-center py-8">
                <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد تسجيلات</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الطالب</TableHead>
                      <TableHead>الرقم التسلسلي</TableHead>
                      <TableHead>القاعة</TableHead>
                      <TableHead>المعلم</TableHead>
                      <TableHead>المرحلة</TableHead>
                      <TableHead>الوقت</TableHead>
                      <TableHead>الأيام</TableHead>
                      <TableHead>الرسوم</TableHead>
                      <TableHead>المدفوع</TableHead>
                      <TableHead>حالة الدفع</TableHead>
                      <TableHead>تاريخ التسجيل</TableHead>
                      {canManageRegistrations && <TableHead>الإجراءات</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegistrations.map((registration) => (
                      <TableRow key={registration.id}>
                        <TableCell className="font-medium">
                          {registration.student?.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{registration.student?.serial_number}</Badge>
                        </TableCell>
                        <TableCell>{registration.booking?.halls?.name}</TableCell>
                        <TableCell>{registration.booking?.teachers?.name}</TableCell>
                        <TableCell>{registration.booking?.academic_stages?.name}</TableCell>
                        <TableCell>
                          {registration.booking?.start_time ? 
                            formatTimeAmPm(registration.booking.start_time) : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {registration.booking?.days_of_week ? 
                            getDaysInArabic(registration.booking.days_of_week) : '-'
                          }
                        </TableCell>
                        <TableCell>{registration.total_fees?.toFixed(2) || '0.00'} LE</TableCell>
                        <TableCell>{registration.paid_amount?.toFixed(2) || '0.00'} LE</TableCell>
                        <TableCell>{getPaymentStatusBadge(registration.payment_status)}</TableCell>
                        <TableCell>
                          {formatShortArabicDate(registration.registration_date)}
                        </TableCell>
                        {canManageRegistrations && (
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="flex items-center gap-1"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  حذف
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل أنت متأكد من حذف تسجيل "{registration.student?.name}"؟ 
                                    هذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع سجلات الحضور والمدفوعات.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(registration.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fast Registration Modal */}
        <FastRegistrationModal 
          isOpen={showFastRegistration}
          onClose={() => setShowFastRegistration(false)}
        />

        {/* Register Student Modal */}
        <RegisterStudentModal 
          isOpen={showRegisterStudent}
          onClose={() => setShowRegisterStudent(false)}
        />
      </main>
    </div>
  );
};

export default StudentRegistrationsPage;