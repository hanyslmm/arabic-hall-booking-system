import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Search, UserPlus, CreditCard, Clock, Phone, MapPin, Hash, Scan } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsApi, studentRegistrationsApi, paymentsApi } from '@/api/students';
import { attendanceApi } from '@/api/students';
import { format } from 'date-fns';
import { Scanner } from '@alzera/react-scanner';
interface FastReceptionistModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStudentId?: string;
}

interface StudentInfo {
  id: string;
  serial_number: string;
  name: string;
  mobile_phone: string;
  parent_phone?: string;
  city?: string;
  registrations?: Array<{
    id: string;
    booking_id: string;
    total_fees: number;
    paid_amount: number;
    payment_status: string;
    booking?: {
      class_code?: string;
      teachers?: { name: string };
      halls?: { name: string };
      start_time: string;
      days_of_week: string[];
    };
  }>;
}

export function FastReceptionistModal({ isOpen, onClose, initialStudentId }: FastReceptionistModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedRegistrationId, setSelectedRegistrationId] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
const queryClient = useQueryClient();
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function preload() {
      if (isOpen && initialStudentId && !selectedStudent) {
        try {
          const { studentsApi } = await import('@/api/students');
          const s = await studentsApi.getById(initialStudentId);
          if (!cancelled && s) {
            setSelectedStudent(s as any);
          }
        } catch (_) {
          // ignore
        }
      }
    }
    preload();
    return () => { cancelled = true; };
  }, [isOpen, initialStudentId]);
  // Search students by serial or mobile
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['student-search', searchTerm],
    queryFn: () => searchTerm.length >= 3 ? studentsApi.search(searchTerm) : [],
    enabled: searchTerm.length >= 3
  });

  // Get student registrations when student is selected
  const { data: registrations } = useQuery({
    queryKey: ['student-registrations', selectedStudent?.id],
    queryFn: async () => {
      if (!selectedStudent?.id) return [];
      const allRegistrations = await studentRegistrationsApi.getAll();
      return allRegistrations.filter(reg => reg.student_id === selectedStudent.id);
    },
    enabled: !!selectedStudent?.id
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: { registrationId: string; amount: number }) => {
      return await paymentsApi.create({
        student_registration_id: data.registrationId,
        amount: data.amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        notes: `Fast payment - ${format(new Date(), 'MMM dd, yyyy HH:mm')}`
      });
    },
    onSuccess: () => {
      toast({ title: 'تم إضافة الدفعة بنجاح', description: 'تم تسجيل الدفعة في النظام' });
      queryClient.invalidateQueries({ queryKey: ['student-registrations'] });
      setPaymentAmount('');
      setSelectedRegistrationId('');
    },
    onError: (error) => {
      toast({ title: 'خطأ في إضافة الدفعة', description: String(error), variant: 'destructive' });
    }
  });

  const attendanceMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      const today = new Date().toISOString().split('T')[0];
      return await attendanceApi.markPresentForDate(registrationId, today);
    },
    onSuccess: () => {
      toast({ title: 'تم تسجيل الحضور اليوم', description: 'تم وضع علامة حضور لهذا التسجيل' });
    },
    onError: (error) => {
      toast({ title: 'خطأ في تسجيل الحضور', description: String(error), variant: 'destructive' });
    }
  });

  // Auto-focus search when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-search when user types serial/mobile
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setSelectedStudent(null);
  };

  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
    setSearchTerm('');
  };

  const handlePayment = () => {
    if (!selectedRegistrationId || !paymentAmount) {
      toast({ title: 'يرجى اختيار التسجيل وإدخال المبلغ', variant: 'destructive' });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'يرجى إدخال مبلغ صحيح', variant: 'destructive' });
      return;
    }

    paymentMutation.mutate({ registrationId: selectedRegistrationId, amount });
  };

  const formatTime = (timeStr: string) => {
    return format(new Date(`2000-01-01T${timeStr}`), 'h:mm a');
  };

  const formatDays = (days: string[]) => {
    const dayMap: Record<string, string> = {
      'saturday': 'السبت',
      'sunday': 'الأحد',
      'monday': 'الاثنين',
      'tuesday': 'الثلاثاء',
      'wednesday': 'الأربعاء',
      'thursday': 'الخميس',
      'friday': 'الجمعة'
    };
    return days.map(day => dayMap[day] || day).join(', ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-5 w-5 text-primary" />
            التسجيل السريع - الاستقبال
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                البحث عن الطالب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="search">الرقم التسلسلي أو رقم الموبايل</Label>
                <div className="flex items-center gap-2">
                  <Input
                    ref={searchInputRef}
                    id="search"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const term = searchTerm.trim();
                        const results = (searchResults as any[]) || [];
                        const exact = results.find((s: any) => s.serial_number === term || s.mobile_phone === term);
                        if (exact) {
                          handleStudentSelect(exact);
                        } else if (results.length === 1) {
                          handleStudentSelect(results[0]);
                        }
                      }
                    }}
                    placeholder="ادخل الرقم التسلسلي أو الموبايل..."
                    className="text-lg flex-1"
                  />
                  <Button type="button" variant={showScanner ? 'secondary' : 'outline'} onClick={() => setShowScanner(v => !v)} className="whitespace-nowrap">
                    <Scan className="h-4 w-4 ml-2" />
                    {showScanner ? 'إيقاف الماسح' : 'تشغيل الماسح'}
                  </Button>
                </div>
              </div>

              {showScanner && (
                <div className="rounded-md border p-2 bg-muted/30">
                  <Scanner 
                    onScan={(d: string | null) => {
                      const v = (d || '').trim();
                      if (!v) return;
                      setShowScanner(false);
                      handleSearch(v);
                      // Try to auto-select if result appears
                      setTimeout(() => {
                        const results = (searchResults as any[]) || [];
                        const exact = results.find((s: any) => s.serial_number === v || s.mobile_phone === v);
                        if (exact) handleStudentSelect(exact);
                      }, 400);
                    }}
                    decoderOptions={{ formats: ['qr_code','code_128','code_39','ean_13','ean_8','upc_a','upc_e'] }}
                    aspectRatio="4/3"
                    className="w-full rounded-md overflow-hidden"
                  />
                  <p className="text-xs text-muted-foreground mt-2">يمكنك أيضاً استخدام قارئ الباركود المتصل كلوحة مفاتيح؛ سيملأ الحقل تلقائياً.</p>
                </div>
              )}

              {/* Search Results */}
              {searching && (
                <div className="text-center py-4 text-muted-foreground">
                  جاري البحث...
                </div>
              )}

              {searchResults && searchResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((student) => (
                    <Card 
                      key={student.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleStudentSelect(student)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                {student.serial_number}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {student.mobile_phone}
                              </span>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">اختيار</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {searchTerm.length >= 3 && searchResults?.length === 0 && !searching && (
                <div className="text-center py-4 text-muted-foreground">
                  لم يتم العثور على نتائج
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student Info & Payment Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                معلومات الطالب والدفع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedStudent ? (
                <>
                  {/* Student Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{selectedStudent.name}</h3>
                      <Badge variant="outline" className="text-primary">
                        #{selectedStudent.serial_number}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>الموبايل: {selectedStudent.mobile_phone}</span>
                      </div>
                      {selectedStudent.parent_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>هاتف الوالدين: {selectedStudent.parent_phone}</span>
                        </div>
                      )}
                      {selectedStudent.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>المدينة: {selectedStudent.city}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Registrations */}
                  <div className="space-y-3">
                    <h4 className="font-medium">التسجيلات الحالية</h4>
                    {registrations && registrations.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {registrations.map((reg) => (
                          <Card key={reg.id} className="bg-muted/30">
                            <CardContent className="p-3">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium">
                                    {reg.booking?.class_code || 'غير محدد'}
                                  </div>
                                  <Badge 
                                    variant={reg.payment_status === 'paid' ? 'default' : 'destructive'}
                                  >
                                    {reg.payment_status === 'paid' ? 'مدفوع' : 
                                     reg.payment_status === 'partial' ? 'جزئي' : 'معلق'}
                                  </Badge>
                                </div>
                                
                                <div className="text-sm text-muted-foreground space-y-1">
                                  <div>المدرس: {reg.booking?.teachers?.name || 'غير محدد'}</div>
                                  <div>القاعة: {reg.booking?.halls?.name || 'غير محدد'}</div>
                                  <div>الوقت: {reg.booking?.start_time ? formatTime(reg.booking.start_time) : 'غير محدد'}</div>
                                  <div>الأيام: {reg.booking?.days_of_week ? formatDays(reg.booking.days_of_week) : 'غير محدد'}</div>
                                </div>
                                
                                <div className="flex items-center justify-between text-sm">
                                  <span>الرسوم: {reg.total_fees} LE</span>
                                  <span>المدفوع: {reg.paid_amount} LE</span>
                                  <span className="font-medium">
                                    المتبقي: {(reg.total_fees - reg.paid_amount)} LE
                                  </span>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => attendanceMutation.mutate(reg.id)}
                                    disabled={attendanceMutation.isPending}
                                  >
                                    وضع حضور اليوم
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        لا توجد تسجيلات حالية
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Payment Form */}
                  {registrations && registrations.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        إضافة دفعة
                      </h4>
                      
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="registration">اختيار التسجيل</Label>
                          <select
                            id="registration"
                            value={selectedRegistrationId}
                            onChange={(e) => setSelectedRegistrationId(e.target.value)}
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="">اختر التسجيل...</option>
                            {registrations.map((reg) => (
                              <option key={reg.id} value={reg.id}>
                                {reg.booking?.class_code} - متبقي: {(reg.total_fees - reg.paid_amount)} LE
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <Label htmlFor="amount">مبلغ الدفعة (LE)</Label>
                          <Input
                            id="amount"
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder="ادخل المبلغ..."
                            min="0"
                            step="0.01"
                          />
                        </div>
                        
                        <Button 
                          onClick={handlePayment}
                          disabled={paymentMutation.isPending || !selectedRegistrationId || !paymentAmount}
                          className="w-full"
                        >
                          {paymentMutation.isPending ? 'جاري الحفظ...' : 'تسجيل الدفعة'}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  اختر طالب من نتائج البحث لعرض المعلومات
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}