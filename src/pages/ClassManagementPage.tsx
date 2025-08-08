import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Navbar } from '@/components/layout/Navbar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ArrowLeft, Plus, Save, DollarSign, Users, Calendar, Upload, Trash2, FileText, Edit, Filter } from 'lucide-react';
import { bookingsApi } from '@/api/bookings';
import { studentRegistrationsApi, attendanceApi, paymentsApi } from '@/api/students';
import { studentsApi } from '@/api/students';
import { BulkUploadModal } from '@/components/student/BulkUploadModal';
import { format } from 'date-fns';

interface AttendanceRecord {
  student_registration_id: string;
  attendance_date: string;
  status: 'present' | 'absent';
  notes?: string;
}

interface PaymentRecord {
  student_registration_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'card' | 'transfer' | 'other';
  reference_number?: string;
  notes?: string;
}

export default function ClassManagementPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});
  const [paymentData, setPaymentData] = useState<Record<string, PaymentRecord>>({});
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isEditClassFeesOpen, setIsEditClassFeesOpen] = useState(false);
  const [isAttendanceReportOpen, setIsAttendanceReportOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [customFees, setCustomFees] = useState<Record<string, number>>({});
  const [paymentMonth, setPaymentMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [attendanceDate, setAttendanceDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newClassFees, setNewClassFees] = useState<number>(0);

  // Fetch booking details
  const { data: booking, isLoading: isLoadingBooking } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsApi.getById(bookingId!),
    enabled: !!bookingId,
  });

  // Fetch registrations for this booking
  const { data: registrations, isLoading: isLoadingRegistrations } = useQuery({
    queryKey: ['registrations', bookingId],
    queryFn: () => studentRegistrationsApi.getByBooking(bookingId!),
    enabled: !!bookingId,
  });

  // Fetch all students for adding new ones
  const { data: allStudents } = useQuery({
    queryKey: ['students'],
    queryFn: studentsApi.getAll,
  });

  // Update booking mutation (for class fees)
  const updateBookingMutation = useMutation({
    mutationFn: (data: { id: string; class_fees: number }) =>
      bookingsApi.setCustomFeeForBooking(data.id, data.class_fees),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      setIsEditClassFeesOpen(false);
      toast({ title: 'تم تحديث رسوم المجموعة بنجاح' });
    },
    onError: () => {
      toast({ title: 'خطأ في تحديث رسوم المجموعة', variant: 'destructive' });
    },
  });

  // Add student to class mutation
  const addStudentMutation = useMutation({
    mutationFn: (data: { student_id: string; booking_id: string; total_fees: number }) =>
      studentRegistrationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations', bookingId] });
      setIsAddStudentOpen(false);
      setSelectedStudentId('');
      toast({ title: 'تم إضافة الطالب بنجاح' });
    },
    onError: () => {
      toast({ title: 'خطأ في إضافة الطالب', variant: 'destructive' });
    },
  });

  // Remove student mutation
  const removeStudentMutation = useMutation({
    mutationFn: studentRegistrationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations', bookingId] });
      toast({ title: 'تم حذف الطالب بنجاح' });
    },
    onError: () => {
      toast({ title: 'خطأ في حذف الطالب', variant: 'destructive' });
    },
  });

  // Bulk remove students mutation
  const bulkRemoveStudentsMutation = useMutation({
    mutationFn: async (registrationIds: string[]) => {
      for (const id of registrationIds) {
        await studentRegistrationsApi.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations', bookingId] });
      setSelectedStudents(new Set());
      toast({ title: 'تم حذف الطلاب المحددين بنجاح' });
    },
    onError: () => {
      toast({ title: 'خطأ في حذف الطلاب', variant: 'destructive' });
    },
  });

  // Save attendance mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: attendanceApi.bulkCreate,
    onSuccess: () => {
      toast({ title: 'تم حفظ الحضور بنجاح' });
      setAttendanceData({});
    },
    onError: () => {
      toast({ title: 'خطأ في حفظ الحضور', variant: 'destructive' });
    },
  });

  // Save payment mutation
  const savePaymentMutation = useMutation({
    mutationFn: paymentsApi.bulkCreate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations', bookingId] });
      toast({ title: 'تم حفظ المدفوعات بنجاح' });
      setPaymentData({});
    },
    onError: () => {
      toast({ title: 'خطأ في حفظ المدفوعات', variant: 'destructive' });
    },
  });

  // Enhanced bulk student upload mutation
  const bulkStudentMutation = useMutation({
    mutationFn: async (students: any[]) => {
      const results = [];
      for (const studentData of students) {
        try {
          // Check if student already exists by mobile phone in this class
          const existingRegistration = registrations?.find(reg => 
            reg.student?.mobile_phone === studentData.mobile
          );

          if (existingRegistration) {
            // Update existing student info and payment
            await studentsApi.update(existingRegistration.student!.id, {
              name: studentData.name,
              mobile_phone: studentData.mobile,
              parent_phone: studentData.home,
              city: studentData.city,
            });

            // Add payment if amount > 0
            if (studentData.payment > 0) {
              await paymentsApi.create({
                student_registration_id: existingRegistration.id,
                amount: studentData.payment,
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: 'cash',
                notes: `دفعة شهر ${paymentMonth}`,
              });
            }

            results.push({ student: existingRegistration.student, registration: existingRegistration, action: 'updated' });
          } else {
            // Check if student exists globally but not in this class
            const globalStudent = allStudents?.find(s => s.mobile_phone === studentData.mobile);
            
            let student;
            if (globalStudent) {
              // Update existing global student
              student = await studentsApi.update(globalStudent.id, {
                name: studentData.name,
                mobile_phone: studentData.mobile,
                parent_phone: studentData.home,
                city: studentData.city,
              });
            } else {
              // Create new student
              student = await studentsApi.create({
                name: studentData.name,
                mobile_phone: studentData.mobile,
                parent_phone: studentData.home,
                city: studentData.city,
              });
            }

            // Register student to class
            const registration = await studentRegistrationsApi.create({
              student_id: student.id,
              booking_id: bookingId!,
              total_fees: studentData.payment || booking?.class_fees || 0,
            });

            // Add initial payment if amount > 0
            if (studentData.payment > 0) {
              await paymentsApi.create({
                student_registration_id: registration.id,
                amount: studentData.payment,
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: 'cash',
                notes: `دفعة شهر ${paymentMonth}`,
              });
            }

            results.push({ student, registration, action: globalStudent ? 'added_to_class' : 'created' });
          }
        } catch (error) {
          console.error(`Error processing student ${studentData.name}:`, error);
          // Continue with next student instead of failing entire batch
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['registrations', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      const created = results.filter(r => r.action === 'created').length;
      const updated = results.filter(r => r.action === 'updated').length;
      toast({ 
        title: 'تم رفع الطلاب بنجاح', 
        description: `تم إضافة ${created} طالب جديد وتحديث ${updated} طالب موجود` 
      });
    },
    onError: () => {
      toast({ title: 'خطأ في رفع بيانات الطلاب', variant: 'destructive' });
    },
  });

  const handleAttendanceChange = (registrationId: string, isPresent: boolean) => {
    if (isPresent) {
      setAttendanceData(prev => ({
        ...prev,
        [registrationId]: {
          student_registration_id: registrationId,
          attendance_date: `${attendanceDate} ${format(new Date(), 'HH:mm:ss')}`,
          status: 'present',
        }
      }));
    } else {
      // Remove from attendance data if unchecked (will be considered absent)
      setAttendanceData(prev => {
        const newData = { ...prev };
        delete newData[registrationId];
        return newData;
      });
    }
  };

  const handlePaymentChange = (registrationId: string, amount: number) => {
    setPaymentData(prev => ({
      ...prev,
      [registrationId]: {
        student_registration_id: registrationId,
        amount,
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: 'cash',
        notes: `دفعة شهر ${paymentMonth}`,
      }
    }));
  };

  const handleAddStudent = () => {
    if (!selectedStudentId || !booking) return;
    
    const fees = customFees[selectedStudentId] || booking.class_fees || 0;
    
    addStudentMutation.mutate({
      student_id: selectedStudentId,
      booking_id: bookingId!,
      total_fees: fees,
    });
  };

  const handleStudentSelection = (registrationId: string, checked: boolean) => {
    const newSelected = new Set(selectedStudents);
    if (checked) {
      newSelected.add(registrationId);
    } else {
      newSelected.delete(registrationId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(new Set(filteredRegistrations.map(reg => reg.id)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleBulkRemove = () => {
    if (selectedStudents.size === 0) return;
    bulkRemoveStudentsMutation.mutate(Array.from(selectedStudents));
  };

  const handleUpdateClassFees = () => {
    if (!booking || newClassFees < 0) return;
    updateBookingMutation.mutate({
      id: booking.id,
      class_fees: newClassFees
    });
  };

  const saveAttendance = () => {
    const records = Object.values(attendanceData);
    if (records.length === 0) {
      toast({ title: 'لا توجد بيانات حضور للحفظ', variant: 'destructive' });
      return;
    }
    saveAttendanceMutation.mutate(records);
  };

  const savePayments = () => {
    const records = Object.values(paymentData);
    if (records.length === 0) {
      toast({ title: 'لا توجد مدفوعات للحفظ', variant: 'destructive' });
      return;
    }
    savePaymentMutation.mutate(records);
  };

  // Filter registrations based on search and status
  const filteredRegistrations = registrations?.filter(registration => {
    const matchesSearch = !searchFilter || 
      registration.student?.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      registration.student?.mobile_phone.includes(searchFilter) ||
      registration.student?.serial_number.includes(searchFilter);
    
    const matchesStatus = statusFilter === 'all' || registration.payment_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  if (isLoadingBooking || isLoadingRegistrations) {
    return <LoadingSpinner />;
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-8 pt-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive">الحجز غير موجود</h1>
          </div>
        </div>
      </div>
    );
  }

  const availableStudents = allStudents?.filter(student => 
    !registrations?.some(reg => reg.student?.id === student.id)
  ) || [];

  const totalPaid = registrations?.reduce((sum, reg) => sum + (reg.paid_amount || 0), 0) || 0;
  const totalFees = registrations?.reduce((sum, reg) => sum + (reg.total_fees || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto py-8 pt-20">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/bookings')}>
            <ArrowLeft className="h-4 w-4 ml-2" />
            العودة للحجوزات
          </Button>
          <h1 className="text-3xl font-bold">إدارة المجموعة</h1>
        </div>

        {/* Class Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                معلومات المجموعة
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setNewClassFees(booking.class_fees || 0);
                  setIsEditClassFeesOpen(true);
                }}
              >
                <Edit className="h-4 w-4 ml-2" />
                تعديل الرسوم
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">القاعة</Label>
                <p className="text-lg">{booking.halls?.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">المدرس</Label>
                <p className="text-lg">{booking.teachers?.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">الوقت</Label>
                <p className="text-lg">{booking.start_time}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">الأيام</Label>
                <p className="text-lg">{booking.days_of_week?.join(', ')}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">رسوم المجموعة</Label>
                <p className="text-lg">{booking.class_fees || 0} جنيه {booking.is_custom_fee ? '(مخصص)' : '(افتراضي)'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">عدد الطلاب</Label>
                <p className="text-lg">{registrations?.length || 0} طالب</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary - Removed "المتبقي" */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              الملخص المالي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">إجمالي الرسوم</p>
                <p className="text-2xl font-bold text-primary">{totalFees} جنيه</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">المدفوع</p>
                <p className="text-2xl font-bold text-green-600">{totalPaid} جنيه</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Management */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              إدارة الطلاب
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => setIsAttendanceReportOpen(true)} variant="outline">
                <FileText className="h-4 w-4 ml-2" />
                تقرير الحضور
              </Button>
              
              <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة طالب
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إضافة طالب للمجموعة</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>اختر الطالب</Label>
                      <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر طالب" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStudents.map(student => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name} - {student.serial_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedStudentId && (
                      <div>
                        <Label>الرسوم (اختياري - سيتم استخدام رسوم المجموعة الافتراضية)</Label>
                        <Input
                          type="number"
                          placeholder={`${booking.class_fees || 0}`}
                          value={customFees[selectedStudentId] || ''}
                          onChange={(e) => setCustomFees(prev => ({
                            ...prev,
                            [selectedStudentId]: Number(e.target.value) || 0
                          }))}
                        />
                      </div>
                    )}
                    <Button 
                      onClick={handleAddStudent} 
                      disabled={!selectedStudentId || addStudentMutation.isPending}
                      className="w-full"
                    >
                      إضافة الطالب
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button onClick={() => setIsBulkUploadOpen(true)} variant="outline">
                <Upload className="h-4 w-4 ml-2" />
                رفع مجمع
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {registrations && registrations.length > 0 ? (
              <div className="space-y-4">
                {/* Filters and Search */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <Input
                      placeholder="البحث بالاسم أو الموبايل أو الرقم التسلسلي"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-64"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="paid">مدفوع</SelectItem>
                      <SelectItem value="partial">جزئي</SelectItem>
                      <SelectItem value="pending">غير مدفوع</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedStudents.size > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleBulkRemove}
                    >
                      <Trash2 className="h-4 w-4 ml-2" />
                      حذف المحدد ({selectedStudents.size})
                    </Button>
                  )}
                </div>

                {/* Attendance Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">تسجيل الحضور</h3>
                   <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                       <Label className="text-sm">شهر الدفع:</Label>
                       <Input
                         type="month"
                         value={paymentMonth}
                         onChange={(e) => setPaymentMonth(e.target.value)}
                         className="w-40"
                       />
                     </div>
                     <div className="flex items-center gap-2">
                       <Label className="text-sm">تاريخ الحضور:</Label>
                       <Input
                         type="date"
                         value={attendanceDate}
                         onChange={(e) => setAttendanceDate(e.target.value)}
                         className="w-40"
                       />
                     </div>
                    <Button onClick={saveAttendance} disabled={Object.keys(attendanceData).length === 0}>
                      <Save className="h-4 w-4 ml-2" />
                      حفظ الحضور
                    </Button>
                  </div>
                </div>

                {/* Students Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-center p-3">
                          <Checkbox
                            checked={selectedStudents.size === filteredRegistrations.length && filteredRegistrations.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </th>
                        <th className="text-right p-3">الطالب</th>
                        <th className="text-right p-3">الرقم التسلسلي</th>
                        <th className="text-right p-3">الموبايل</th>
                        <th className="text-right p-3">الرسوم</th>
                        <th className="text-right p-3">المدفوع</th>
                        <th className="text-right p-3">حالة الدفع</th>
                        <th className="text-center p-3">الحضور اليوم</th>
                        <th className="text-center p-3">دفع اليوم</th>
                        <th className="text-center p-3">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegistrations.map((registration) => (
                        <tr key={registration.id} className="border-t">
                          <td className="p-3 text-center">
                            <Checkbox
                              checked={selectedStudents.has(registration.id)}
                              onCheckedChange={(checked) => handleStudentSelection(registration.id, checked as boolean)}
                            />
                          </td>
                          <td className="p-3">{registration.student?.name}</td>
                          <td className="p-3">{registration.student?.serial_number}</td>
                          <td className="p-3">{registration.student?.mobile_phone}</td>
                          <td className="p-3">{registration.total_fees} جنيه</td>
                          <td className="p-3">{registration.paid_amount} جنيه</td>
                          <td className="p-3">
                            <Badge 
                              variant={
                                registration.payment_status === 'paid' ? 'default' :
                                registration.payment_status === 'partial' ? 'secondary' : 'destructive'
                              }
                            >
                              {registration.payment_status === 'paid' ? 'مدفوع' :
                               registration.payment_status === 'partial' ? 'جزئي' : 'غير مدفوع'}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center">
                              <label className="flex items-center gap-1 text-sm">
                                <Checkbox
                                  checked={!!attendanceData[registration.id]}
                                  onCheckedChange={(checked) => {
                                    handleAttendanceChange(registration.id, checked as boolean);
                                  }}
                                />
                                حاضر
                              </label>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <Input
                              type="number"
                              placeholder="المبلغ"
                              className="w-20 mx-auto"
                              value={paymentData[registration.id]?.amount || ''}
                              onChange={(e) => handlePaymentChange(registration.id, Number(e.target.value) || 0)}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeStudentMutation.mutate(registration.id)}
                            >
                              حذف
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Payment Actions */}
                <div className="flex justify-end">
                  <Button 
                    onClick={savePayments} 
                    disabled={Object.keys(paymentData).length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="h-4 w-4 ml-2" />
                    حفظ المدفوعات
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">لا يوجد طلاب مسجلين في هذا الصف</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Class Fees Modal */}
        <Dialog open={isEditClassFeesOpen} onOpenChange={setIsEditClassFeesOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل رسوم المجموعة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>الرسوم الجديدة (جنيه)</Label>
                <Input
                  type="number"
                  value={newClassFees}
                  onChange={(e) => setNewClassFees(Number(e.target.value) || 0)}
                  min="0"
                />
                <p className="text-xs text-muted-foreground mt-1">سيتم تطبيق الرسوم على جميع طلاب هذه المجموعة وسيتم اعتبارها رسومًا مخصصة لا تتأثر بتغييرات رسوم المعلم الافتراضية.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditClassFeesOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleUpdateClassFees} disabled={updateBookingMutation.isPending}>
                  حفظ التعديل
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Attendance Report Modal */}
        <Dialog open={isAttendanceReportOpen} onOpenChange={setIsAttendanceReportOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>تقرير الحضور</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">هذه الميزة قيد التطوير...</p>
              {/* TODO: Implement attendance report */}
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Upload Modal */}
        <BulkUploadModal
          isOpen={isBulkUploadOpen}
          onClose={() => setIsBulkUploadOpen(false)}
          onUpload={(students) => bulkStudentMutation.mutate(students)}
          defaultClassFees={booking?.class_fees || 0}
        />
      </div>
    </div>
  );
}