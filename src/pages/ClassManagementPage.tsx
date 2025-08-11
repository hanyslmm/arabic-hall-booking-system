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
import { UnifiedLayout } from '@/components/layout/UnifiedLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ArrowLeft, Plus, Save, DollarSign, Users, Calendar, Upload, Trash2, Edit, Filter } from 'lucide-react';
import { bookingsApi } from '@/api/bookings';
import { studentRegistrationsApi, paymentsApi } from '@/api/students';
import { studentsApi } from '@/api/students';
import { BulkUploadModal } from '@/components/student/BulkUploadModal';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

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
  
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isEditClassFeesOpen, setIsEditClassFeesOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [customFees, setCustomFees] = useState<Record<string, number>>({});
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newClassFees, setNewClassFees] = useState<number>(0);
  const [editingFees, setEditingFees] = useState<Record<string, number>>({});
  const [isApplyingAll, setIsApplyingAll] = useState(false);
  const [viewingStudentDetails, setViewingStudentDetails] = useState<any | null>(null);

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
                notes: `دفعة شهر ${format(new Date(), 'yyyy-MM')}`,
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
                notes: `دفعة شهر ${format(new Date(), 'yyyy-MM')}`,
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

  // Per-student fee update
  const updateStudentFeeMutation = useMutation({
    mutationFn: async ({ id, fees }: { id: string; fees: number }) =>
      studentRegistrationsApi.updateFeesWithStatus(id, fees),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations', bookingId] });
      setEditingFees({});
      toast({ title: 'تم تحديث رسوم الطالب' });
    },
    onError: () => {
      toast({ title: 'خطأ في تحديث رسوم الطالب', variant: 'destructive' });
    },
  });

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

  const applyClassFeeToAll = async () => {
    if (!booking) return;
    setIsApplyingAll(true);
    try {
      await bookingsApi.applyBookingFeeToRegistrations(booking.id);
      queryClient.invalidateQueries({ queryKey: ['registrations', bookingId] });
      toast({ title: 'تم تطبيق رسوم المجموعة على جميع الطلاب' });
    } catch (e) {
      toast({ title: 'فشل تطبيق الرسوم على الجميع', variant: 'destructive' });
    } finally {
      setIsApplyingAll(false);
    }
  };

  const handleUpdateClassFees = async () => {
    if (!booking || newClassFees < 0) return;
    try {
      const updated = await bookingsApi.setCustomFeeForBooking(booking.id, newClassFees);
      // Explicit RPC already called inside API; invalidate queries afterwards
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['registrations', bookingId] });
      setIsEditClassFeesOpen(false);
      toast({ title: 'تم تحديث رسوم المجموعة وتطبيقها على جميع الطلاب' });
    } catch (e) {
      toast({ title: 'خطأ في تحديث رسوم المجموعة', variant: 'destructive' });
    }
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

  // Payment summary counts and rate for current class (period = current month by default)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const isInCurrentMonth = (dateString?: string | null) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    return d >= monthStart && d < monthEnd;
  };

  const totalStudents = registrations?.length || 0;
  const paidStudentsThisMonth = (registrations || []).filter(reg =>
    (reg as any).payment_records ? (reg as any).payment_records.some((pr: any) => isInCurrentMonth(pr.payment_date)) : (reg.paid_amount || 0) >= (reg.total_fees || 0)
  ).length;
  const paymentRate = totalStudents > 0 ? Math.round((paidStudentsThisMonth / totalStudents) * 100) : 0;

  if (isLoadingBooking || isLoadingRegistrations) {
    return (
      <UnifiedLayout>
        <div className="py-8">
          <div className="text-center">
            <LoadingSpinner />
          </div>
        </div>
      </UnifiedLayout>
    );
  }

  if (!booking) {
    return (
      <UnifiedLayout>
        <div className="py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive">الحجز غير موجود</h1>
          </div>
        </div>
      </UnifiedLayout>
    );
  }

  const availableStudents = allStudents?.filter(student => 
    !registrations?.some(reg => reg.student?.id === student.id)
  ) || [];

  const totalPaid = registrations?.reduce((sum, reg) => sum + (reg.paid_amount || 0), 0) || 0;
  const totalFees = registrations?.reduce((sum, reg) => sum + (reg.total_fees || 0), 0) || 0;

  return (
    <UnifiedLayout>
      <div className="py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/bookings')}>
            <ArrowLeft className="h-4 w-4 ml-2" />
            العودة للحجوزات
          </Button>
          <h1 className="text-3xl font-bold">إدارة المجموعة</h1>
        </div>

        {/* Payment Status Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              ملخص حالة الدفع لهذا الشهر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <div className="text-sm text-muted-foreground">إجمالي الطلاب</div>
                <div className="text-2xl font-bold">{totalStudents}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">عدد المدفوعين هذا الشهر</div>
                <div className="text-2xl font-bold text-green-600">{paidStudentsThisMonth}</div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">نسبة الدفع</span>
                  <span className="font-semibold">{paymentRate}%</span>
                </div>
                <Progress value={paymentRate} />
              </div>
            </div>
          </CardContent>
        </Card>

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
            <CardTitle className="flex items_center gap-2">
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Button onClick={applyClassFeeToAll} variant="outline" disabled={isApplyingAll}>
                <DollarSign className="h-4 w-4 ml-2" />
                {isApplyingAll ? 'جارٍ التطبيق...' : 'تطبيق رسوم المجموعة على الجميع'}
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
                          <td 
                            className="p-3 font-medium cursor-pointer hover:text-primary"
                            onClick={() => setViewingStudentDetails(registration)}
                          >
                            {registration.student?.name}
                          </td>
                          <td className="p-3">{registration.student?.serial_number}</td>
                          <td className="p-3">{registration.student?.mobile_phone}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Input
                                className="w-28"
                                type="number"
                                value={editingFees[registration.id] ?? registration.total_fees}
                                onChange={(e)=> setEditingFees(prev=> ({...prev, [registration.id]: Number(e.target.value) || 0}))}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStudentFeeMutation.mutate({ id: registration.id, fees: editingFees[registration.id] ?? registration.total_fees })}
                              >حفظ</Button>
                            </div>
                          </td>
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
                <Button onClick={handleUpdateClassFees}>
                  حفظ التعديل
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Student Details Modal */}
        {viewingStudentDetails && (
          <Dialog open={!!viewingStudentDetails} onOpenChange={() => setViewingStudentDetails(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>تفاصيل الطالب: {viewingStudentDetails.student?.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <p><strong>الرقم التسلسلي:</strong> {viewingStudentDetails.student?.serial_number}</p>
                  <p><strong>رقم الهاتف:</strong> {viewingStudentDetails.student?.mobile_phone}</p>
                  <p><strong>رسوم المجموعة:</strong> {viewingStudentDetails.total_fees} جنيه</p>
                  <p><strong>إجمالي المدفوع:</strong> {viewingStudentDetails.paid_amount} جنيه</p>
                  <p><strong>الحالة:</strong> <Badge variant={viewingStudentDetails.payment_status === 'paid' ? 'default' : 'destructive'}>{viewingStudentDetails.payment_status}</Badge></p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">سجل الحضور الشهري</h4>
                  <div className="p-4 border rounded-md text-center text-muted-foreground">
                    (سيتم إضافة عرض الحضور الشهري هنا)
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Bulk Upload Modal */}
        <BulkUploadModal
          isOpen={isBulkUploadOpen}
          onClose={() => setIsBulkUploadOpen(false)}
        />
      </div>
    </UnifiedLayout>
  );
}