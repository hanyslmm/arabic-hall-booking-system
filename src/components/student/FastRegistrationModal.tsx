import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { studentsApi, studentRegistrationsApi, paymentsApi, Student } from "@/api/students";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Scan, DollarSign, Calendar, Users, Camera, X, CreditCard } from "lucide-react";
import { BarcodeScanner } from "@alzera/react-scanner";
import { formatTimeAmPm } from "@/utils/dateUtils";
import { attendanceApi } from "@/api/students";

interface FastRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Booking {
  id: string;
  hall_id: string;
  teacher_id: string;
  academic_stage_id: string;
  start_time: string;
  days_of_week: string[];
  number_of_students: number;
  class_fees: number;
  halls?: { name: string };
  teachers?: { name: string };
  academic_stages?: { name: string };
}

interface SelectedClass {
  id: string;
  checked: boolean;
  fees: number;
}

export const FastRegistrationModal = ({ isOpen, onClose }: FastRegistrationModalProps) => {
  const queryClient = useQueryClient();
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerPreference, setScannerPreference] = useState(() => {
    return localStorage.getItem('scanner-preference') === 'camera';
  });
  const [barcodeInput, setBarcodeInput] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [physicalScannerMode, setPhysicalScannerMode] = useState(false);
  const [scanBuffer, setScanBuffer] = useState("");
  const [lastScanTime, setLastScanTime] = useState(0);
  const [selectedClasses, setSelectedClasses] = useState<Record<string, SelectedClass>>({});
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [autoRegisterMode, setAutoRegisterMode] = useState(false);
  const [registerAllClasses, setRegisterAllClasses] = useState(false);
  const [flexibleSearch, setFlexibleSearch] = useState(false);
  const [ultraFastMode, setUltraFastMode] = useState(false);
  const [ultraResults, setUltraResults] = useState<Array<{
    id: string;
    hall?: string;
    teacher?: string;
    start_time?: string;
    fees: number;
    attendanceMarked: boolean;
    paymentCreated: boolean;
  }>>([]);

  // Get today's weekday to filter relevant classes
  const today = new Date();
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayWeekday = weekdays[today.getDay()];

  // Today ISO string for attendance and payment
  const todayISO = new Date().toISOString().split('T')[0];

  // Fetch today's active bookings
  const { data: todaysBookings = [] } = useQuery({
    queryKey: ["todays-bookings", todayWeekday],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          halls(name),
          teachers(name),
          academic_stages(name)
        `)
        .eq("status", "active")
        .contains("days_of_week", [todayWeekday])
        .order("start_time");
      
      if (error) throw error;
      return data as Booking[];
    },
  });

  // Fetch existing registrations for the selected student
  const { data: existingRegistrations = [] } = useQuery({
    queryKey: ["student-existing-registrations", selectedStudent?.id],
    queryFn: async () => {
      if (!selectedStudent?.id) return [];
      
      const { data, error } = await supabase
        .from("student_registrations")
        .select(`
          id,
          booking_id,
          bookings!inner(
            id,
            days_of_week,
            status
          )
        `)
        .eq("student_id", selectedStudent.id)
        .eq("bookings.status", "active");
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudent?.id,
  });

  const searchMutation = useMutation({
    mutationFn: async (term: string) => {
      if (flexibleSearch) {
        return await studentsApi.searchFlexible(term);
      }
      // default: exact serial match
      return await studentsApi.searchBySerialExact(term);
    },
    onSuccess: (students) => {
      if (!flexibleSearch && students.length > 1) {
        // exact serial should return max 1; if multiple due to data issue, take exact equality first
        const exact = students.find((s) => s.serial_number === barcodeInput.trim());
        if (exact) students = [exact];
      }
      if (students.length === 1) {
        setSelectedStudent(students[0]);
        setScannerActive(false);
        setSelectedClasses({});
        setTotalAmount(0);
        setPaymentAmount("0");
        setUltraResults([]);
      } else if (students.length === 0) {
        toast.error("لم يتم العثور على الطالب");
      }
    },
    onError: () => {
      toast.error("فشل في البحث عن الطالب");
    }
  });

  const registerMutation = useMutation({
    mutationFn: async ({ registrations }: { registrations: Array<{ student_id: string; booking_id: string; total_fees: number; paid_amount: number }> }) => {
      // Register student in multiple classes
      const registrationPromises = registrations.map(reg => 
        studentRegistrationsApi.create({
          student_id: reg.student_id,
          booking_id: reg.booking_id,
          total_fees: reg.total_fees,
          notes: reg.paid_amount > 0 ? `دفع سريع: ${reg.paid_amount} LE` : undefined
        })
      );
      
      const createdRegistrations = await Promise.all(registrationPromises);
      
      // Create payment records for paid amounts
      const paymentPromises = createdRegistrations
        .map((registration, index) => {
          const paidAmount = registrations[index].paid_amount;
          if (paidAmount > 0) {
            return paymentsApi.create({
              student_registration_id: registration.id,
              amount: paidAmount,
              payment_date: new Date().toISOString().split('T')[0],
              payment_method: 'cash',
              notes: 'دفع سريع عند التسجيل'
            });
          }
          return null;
        })
        .filter(Boolean);
      
      if (paymentPromises.length > 0) {
        await Promise.all(paymentPromises);
      }
      
      return createdRegistrations;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["student-registrations"] });
      queryClient.invalidateQueries({ queryKey: ["student-existing-registrations"] });
      toast.success(`تم تسجيل الطالب في ${results.length} دورة بنجاح`);
      
      // Reset form but keep scanner preference for fast sequential scanning
      const wasScanning = scannerActive;
      setBarcodeInput("");
      setSelectedStudent(null);
      setSelectedClasses({});
      setTotalAmount(0);
      setPaymentAmount("");
      setIsRegistering(false);
      searchMutation.reset();
      
      // Auto-reactivate scanner/input for fast sequential scanning
      setTimeout(() => {
        if (wasScanning) {
          // Keep camera active for next student
          setScannerActive(true);
        } else {
          // Auto-focus on barcode input for next manual entry
          const barcodeInput = document.getElementById('barcode') as HTMLInputElement;
          if (barcodeInput) {
            barcodeInput.focus();
          }
        }
      }, 100);
    },
    onError: (error: any) => {
      if (error.message?.includes('student_id, booking_id')) {
        toast.error("الطالب مسجل بالفعل في إحدى هذه الدورات");
      } else {
        toast.error("فشل في تسجيل الطالب");
      }
    }
  });

  // Handle barcode scan
  const handleBarcodeScan = useCallback(async (result: string) => {
    setBarcodeInput(result);
    if (result.trim()) {
      await searchMutation.mutateAsync(result.trim());
      if (ultraFastMode) {
        await handleUltraFastProcess();
      }
    }
  }, [searchMutation, ultraFastMode, handleUltraFastProcess]);

  // Handle manual barcode input
  const handleBarcodeSubmit = async () => {
    if (barcodeInput.trim()) {
      await searchMutation.mutateAsync(barcodeInput.trim());
      if (ultraFastMode) {
        await handleUltraFastProcess();
      }
    }
  };

  // Handle register all classes toggle
  const handleRegisterAllToggle = (checked: boolean) => {
    setRegisterAllClasses(checked);
    if (checked) {
      // Select all available classes
      const allSelected: Record<string, SelectedClass> = {};
      todaysBookings
        .filter(booking => !existingRegistrations.some(reg => reg.booking_id === booking.id))
        .forEach(booking => {
          allSelected[booking.id] = {
            id: booking.id,
            checked: true,
            fees: booking.class_fees || 0
          };
        });
      setSelectedClasses(allSelected);
    } else {
      // Deselect all classes
      setSelectedClasses({});
    }
  };

  // Handle class selection
  const handleClassToggle = (bookingId: string, checked: boolean) => {
    setSelectedClasses(prev => {
      const updated = { ...prev };
      
      if (checked) {
        const booking = todaysBookings.find(b => b.id === bookingId);
        updated[bookingId] = {
          id: bookingId,
          checked: true,
          fees: booking?.class_fees || 0
        };
      } else {
        delete updated[bookingId];
      }
      
      return updated;
    });
  };

  // Handle fees change
  const handleFeesChange = (bookingId: string, fees: number) => {
    setSelectedClasses(prev => ({
      ...prev,
      [bookingId]: {
        ...prev[bookingId],
        fees: fees
      }
    }));
  };

  // Auto-activate scanner on modal open based on preference
  useEffect(() => {
    if (isOpen) {
      if (scannerPreference) {
        // Auto-activate camera scanner
        setTimeout(() => setScannerActive(true), 500);
      } else {
        // Auto-focus on input field
        setTimeout(() => {
          const input = document.getElementById('barcode') as HTMLInputElement;
          if (input) input.focus();
        }, 500);
      }
    }
  }, [isOpen, scannerPreference]);

  // Physical scanner support with buffer for rapid scanning
  useEffect(() => {
    const handlePhysicalScan = (e: KeyboardEvent) => {
      if (!isOpen || !physicalScannerMode) return;
      
      const currentTime = Date.now();
      
      // If it's been more than 100ms since last keystroke, reset buffer
      if (currentTime - lastScanTime > 100) {
        setScanBuffer("");
      }
      
      // Add character to buffer (physical scanners type very fast)
      if (e.key.length === 1) {
        e.preventDefault();
        setScanBuffer(prev => prev + e.key);
        setLastScanTime(currentTime);
      }
      
      // Enter key indicates end of scan
      if (e.key === 'Enter' && scanBuffer.length > 0) {
        e.preventDefault();
        handleBarcodeScan(scanBuffer);
        setScanBuffer("");
        toast.success("تم قراءة الباركود بواسطة الماسح الضوئي");
      }
    };

    if (physicalScannerMode) {
      document.addEventListener('keydown', handlePhysicalScan);
      return () => document.removeEventListener('keydown', handlePhysicalScan);
    }
  }, [isOpen, physicalScannerMode, scanBuffer, lastScanTime, handleBarcodeScan]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      // Skip if physical scanner is processing
      if (physicalScannerMode && e.key !== 'Escape' && e.key !== 'F1') return;
      
      // Escape to close
      if (e.key === 'Escape' && !isRegistering) {
        handleClose();
        return;
      }
      
      // F1 to toggle physical scanner mode
      if (e.key === 'F1') {
        e.preventDefault();
        setPhysicalScannerMode(prev => {
          const newMode = !prev;
          if (newMode) {
            setScannerActive(false); // Turn off camera when using physical scanner
            toast.success("تم تفعيل الماسح الضوئي الخارجي - اضغط F1 للإلغاء");
          } else {
            toast.info("تم إلغاء تفعيل الماسح الضوئي الخارجي");
          }
          return newMode;
        });
        return;
      }
      
      // Space to toggle camera scanner (when not in input and not using physical scanner)
      if (e.key === ' ' && e.target === document.body && !physicalScannerMode) {
        e.preventDefault();
        setScannerActive(prev => {
          const newValue = !prev;
          localStorage.setItem('scanner-preference', newValue ? 'camera' : 'manual');
          setScannerPreference(newValue);
          return newValue;
        });
        return;
      }
      
      // Ctrl+Enter for quick register with default fees
      if (e.ctrlKey && e.key === 'Enter' && selectedStudent && !isRegistering) {
        e.preventDefault();
        handleRegister();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedStudent, isRegistering, physicalScannerMode, handleClose, handleRegister]);

  // Calculate total when selected classes change
  useEffect(() => {
    const total = Object.values(selectedClasses).reduce((sum, cls) => sum + cls.fees, 0);
    setTotalAmount(total);
    setPaymentAmount(total.toString());
  }, [selectedClasses]);

  // Handle registration
  const handleRegister = useCallback(async () => {
    if (!selectedStudent) {
      toast.error("يرجى مسح رمز الطالب أولاً");
      return;
    }

    const selectedClassesList = Object.values(selectedClasses).filter(cls => cls.checked);
    if (selectedClassesList.length === 0) {
      toast.error("يرجى اختيار دورة واحدة على الأقل");
      return;
    }

    const paidAmount = parseFloat(paymentAmount) || 0;
    const amountPerClass = selectedClassesList.length > 0 ? paidAmount / selectedClassesList.length : 0;

    const registrations = selectedClassesList.map(cls => ({
      student_id: selectedStudent.id,
      booking_id: cls.id,
      total_fees: cls.fees,
      paid_amount: amountPerClass
    }));

    setIsRegistering(true);
    try {
      await registerMutation.mutateAsync({ registrations });
    } finally {
      setIsRegistering(false);
    }
  }, [selectedStudent, selectedClasses, paymentAmount, registerMutation]);

  // Ultra-Fast processing: mark attendance for all today's classes and create payment if not paid this month
  const handleUltraFastProcess = useCallback(async () => {
    if (!selectedStudent) return;
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    const todayWeekday = weekdays[now.getDay()];
    const todayISO = new Date().toISOString().split('T')[0];
    // Determine registrations of student and filter to today's classes
    const { data, error } = await supabase
      .from("student_registrations")
      .select(`
        id,
        total_fees,
        payment_status,
        booking:bookings(days_of_week, start_time, halls(name), teachers(name)),
        payment_records(amount, payment_date)
      `)
      .eq("student_id", selectedStudent.id);
    if (error) {
      toast.error("فشل في جلب تسجيلات الطالب");
      return;
    }
    const regs = (data || []).filter((r: any) => (r.booking?.days_of_week || []).includes(todayWeekday));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const results: Array<{
      id: string;
      hall?: string;
      teacher?: string;
      start_time?: string;
      fees: number;
      attendanceMarked: boolean;
      paymentCreated: boolean;
    }> = [];
    for (const r of regs) {
      let attendanceMarked = false;
      let paymentCreated = false;
      try {
        await attendanceApi.markPresentForDate(r.id, todayISO);
        attendanceMarked = true;
      } catch (err) {
        console.warn('Failed to mark attendance', err);
      }
      try {
        // Check if any payment exists in the current month
        const paidThisMonth = (r as any).payment_records?.some((p: any) => {
          const d = new Date(p.payment_date);
          return d >= monthStart && d < monthEnd;
        });
        if (!paidThisMonth) {
          const amount = Number(r.total_fees || 0);
          if (amount > 0) {
            await paymentsApi.create({
              student_registration_id: r.id,
              amount,
              payment_date: todayISO,
              payment_method: 'cash',
              notes: 'Ultra-Fast auto payment'
            });
            paymentCreated = true;
          }
        }
      } catch (err) {
        console.warn('Failed to create payment', err);
      }
      results.push({
        id: r.id,
        hall: r.booking?.halls?.name,
        teacher: r.booking?.teachers?.name,
        start_time: r.booking?.start_time,
        fees: Number(r.total_fees || 0),
        attendanceMarked,
        paymentCreated,
      });
    }
    setUltraResults(results);
    // Keep data on screen for review: fetch existing registrations to hide available class list and show student info
    toast.success("تم تسجيل الحضور والدفع تلقائياً");
  }, [selectedStudent]);

  const handleClose = useCallback(() => {
    setBarcodeInput("");
    setSelectedStudent(null);
    setSelectedClasses({});
    setTotalAmount(0);
    setPaymentAmount("");
    setScannerActive(false);
    setIsRegistering(false);
    setUltraResults([]);
    searchMutation.reset();
    onClose();
  }, [onClose, searchMutation]);

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

  const selectedClassCount = Object.values(selectedClasses).filter(cls => cls.checked).length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right text-base flex items-center justify-between">
            تسجيل سريع للطالب
            <div className="flex gap-2">
              {physicalScannerMode && (
                <Badge variant="default" className="text-xs bg-green-600">
                  <Scan className="h-3 w-3 mr-1" />
                  ماسح ضوئي متصل
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                F1: ماسح ضوئي | Space: كاميرا | Esc: إغلاق
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Compact Barcode Scanner Section */}
          <Card>
            <CardContent className="pt-3 pb-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="flex-search" checked={flexibleSearch} onCheckedChange={(v) => setFlexibleSearch(!!v)} />
                  <Label htmlFor="flex-search" className="text-xs">بحث بالاسم أو الموبايل</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="ultra-fast" checked={ultraFastMode} onCheckedChange={(v) => setUltraFastMode(!!v)} />
                  <Label htmlFor="ultra-fast" className="text-xs">التسجيل فائق السرعة</Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder={flexibleSearch ? "الاسم/الموبايل/الرقم التسلسلي" : "ابحث بالرقم التسلسلي فقط"}
                  className="text-right"
                  onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSubmit()}
                />
                <Button 
                  onClick={handleBarcodeSubmit}
                  disabled={searchMutation.isPending || !barcodeInput.trim()}
                  size="sm"
                >
                  {searchMutation.isPending ? "بحث..." : "بحث"}
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setScannerActive(!scannerActive)}
                  className="flex-1"
                  disabled={physicalScannerMode}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {scannerActive ? "إيقاف الكاميرا" : "تشغيل الكاميرا"}
                </Button>
                <Button
                  type="button"
                  variant={physicalScannerMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPhysicalScannerMode(!physicalScannerMode)}
                  className="flex-1"
                >
                  <Scan className="h-4 w-4 mr-2" />
                  {physicalScannerMode ? "إيقاف الماسح" : "ماسح ضوئي"}
                </Button>
              </div>

              {/* Physical Scanner Mode Indicator */}
              {physicalScannerMode && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <Scan className="h-4 w-4 animate-pulse" />
                    <span className="text-sm font-medium">الماسح الضوئي جاهز</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    امسح الباركود بالماسح الضوئي أو اضغط F1 للإلغاء
                  </p>
                  {scanBuffer && (
                    <div className="mt-2 px-2 py-1 bg-white rounded border text-xs font-mono text-gray-700">
                      {scanBuffer}
                    </div>
                  )}
                </div>
              )}

              {scannerActive && (
                <div className="border-2 border-dashed border-primary rounded-lg p-2 h-32 bg-background/50">
                  <BarcodeScanner
                    onScan={async (data) => {
                      if (data) {
                        await handleBarcodeScan(data);
                        // Visual feedback for successful scan
                        const scanArea = document.querySelector('.border-dashed');
                        if (scanArea) {
                          scanArea.classList.add('border-green-500', 'bg-green-50');
                          setTimeout(() => {
                            scanArea.classList.remove('border-green-500', 'bg-green-50');
                          }, 500);
                        }
                      }
                    }}
                    onError={(error) => {
                      console.error('Scanner error:', error);
                    }}
                    style={{ width: '100%', height: '110px' }}
                    aspectRatio="16/9"
                    delay={300}
                  />
                  <div className="text-center text-xs text-muted-foreground mt-1">
                    وجه الكاميرا نحو الباركود
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compact Selected Student Info */}
          {selectedStudent && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-2 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-600">{selectedStudent.name}</span>
                    <Badge variant="outline" className="text-xs">{selectedStudent.serial_number}</Badge>
                  </div>
                  {/* Register All Classes Option */}
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="register-all"
                      checked={registerAllClasses}
                      onCheckedChange={handleRegisterAllToggle}
                      disabled={ultraFastMode}
                    />
                    <Label htmlFor="register-all" className="text-xs">تسجيل في جميع الدورات</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ultra-Fast Results */}
          {ultraFastMode && selectedStudent && ultraResults.length > 0 && (
            <Card>
              <CardContent className="p-3 space-y-2">
                <div className="text-sm font-medium">نتيجة التسجيل فائق السرعة لليوم</div>
                {ultraResults.map((r) => (
                  <div key={r.id} className="flex items-center justify-between border rounded-md p-2">
                    <div className="text-sm">
                      <div className="font-medium">{r.hall} - {r.teacher}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.start_time ? formatTimeAmPm(r.start_time) : ''} • {r.fees.toFixed(0)} LE
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={r.attendanceMarked ? 'default' : 'secondary'} className="text-xs">
                        حضور
                      </Badge>
                      <Badge variant={r.paymentCreated ? 'default' : 'secondary'} className="text-xs">
                        دفعة
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Available Classes for Registration */}
          {selectedStudent && (
            <Card>
              <CardContent className="p-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <Label className="text-sm font-medium">
                      الدورات المتاحة اليوم ({todaysBookings.filter(booking => !existingRegistrations.some(reg => reg.booking_id === booking.id)).length})
                    </Label>
                  </div>

                  {todaysBookings.filter(booking => !existingRegistrations.some(reg => reg.booking_id === booking.id)).length === 0 ? (
                    <div className="text-center py-4">
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        لا توجد دورات متاحة للتسجيل اليوم
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {todaysBookings
                        .filter((booking) => {
                          // Only show classes the student is NOT registered for
                          return !existingRegistrations.some(reg => reg.booking_id === booking.id);
                        })
                        .map((booking) => {
                        const isSelected = selectedClasses[booking.id]?.checked || false;
                        const fees = selectedClasses[booking.id]?.fees || booking.class_fees || 0;

                        return (
                          <div key={booking.id} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/50">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleClassToggle(booking.id, !!checked)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {booking.halls?.name} - {booking.teachers?.name}
                                  </p>
                                   <p className="text-xs text-muted-foreground truncate">
                                     {booking.academic_stages?.name} | {booking.start_time ? 
                                       formatTimeAmPm(booking.start_time) : ''
                                     }
                                  </p>
                                </div>
                                 <div className="text-sm font-medium text-primary">
                                   {fees.toFixed(0)} LE
                                 </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        <DialogFooter className="flex gap-2 pt-3">
          {selectedStudent && selectedClassCount > 0 && !ultraFastMode && (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm">الإجمالي: {totalAmount.toFixed(0)} LE</span>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="المبلغ المدفوع"
                className="w-24 h-8 text-xs"
              />
            </div>
          )}
          {!ultraFastMode && (
            <Button 
              type="button" 
              onClick={handleRegister}
              disabled={isRegistering || !selectedStudent || selectedClassCount === 0}
              className="h-8 px-4"
            >
              {isRegistering ? "جاري التسجيل..." : `تسجيل (${selectedClassCount})`}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={handleClose} className="h-8 px-4">
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};