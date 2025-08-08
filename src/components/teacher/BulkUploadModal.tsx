import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload, AlertCircle, CheckCircle, Clock, X, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { studentsApi } from '@/api/students';

interface BulkUploadModalProps {
  children: React.ReactNode;
}

interface ParsedClassData {
  sheetName: string;
  teacher?: string;
  days?: string;
  time?: string;
  amPm?: string;
  needsAmPmClarification?: boolean;
  students: StudentDataRow[];
}

interface StudentDataRow {
  name: string;
  mobile: string;
  home?: string;
  city?: string;
  fees?: number;
  darsPayment?: number; // Payment amount from "dars" column
}

interface ProcessingProgress {
  total: number;
  processed: number;
  currentStep: string;
  errors: string[];
}

interface AmPmClarification {
  classCode: string;
  options: ['AM', 'PM'];
  selected?: 'AM' | 'PM';
}

interface HallSelection {
  classCode: string;
  availableHalls: any[];
  selectedHallId?: string;
}

type UploadMode = 'delete' | 'append';

interface UploadModeSelection {
  mode: UploadMode;
  showDialog: boolean;
}

export const BulkUploadModal = ({ children }: BulkUploadModalProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedClassData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [amPmClarifications, setAmPmClarifications] = useState<AmPmClarification[]>([]);
  const [showClarificationDialog, setShowClarificationDialog] = useState(false);
  const [hallSelections, setHallSelections] = useState<HallSelection[]>([]);
  const [showHallSelectionDialog, setShowHallSelectionDialog] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>('append');
  const [showUploadModeDialog, setShowUploadModeDialog] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch teachers and halls data
  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teachers').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: halls } = useQuery({
    queryKey: ['halls'],
    queryFn: async () => {
      const { data, error } = await supabase.from('halls').select('*');
      if (error) throw error;
      return data;
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { parsedData: ParsedClassData[], clarifications: AmPmClarification[], hallSelections: HallSelection[], mode: UploadMode }) => {
      setIsProcessing(true);
      const totalSteps = data.parsedData.reduce((sum, classData) => sum + classData.students.length, 0);
      let processedSteps = 0;

      setProgress({
        total: totalSteps,
        processed: 0,
        currentStep: 'بدء المعالجة...',
        errors: []
      });

      const errors: string[] = [];

      for (const classData of data.parsedData) {
        try {
          setProgress(prev => prev ? {
            ...prev,
            currentStep: `معالجة مجموعة ${classData.sheetName}...`
          } : null);

          // Parse class code and find clarification if needed
          const classCode = classData.sheetName;
          const clarification = data.clarifications.find(c => c.classCode === classCode);
          const finalAmPm = classData.amPm || clarification?.selected;

          if (!finalAmPm) {
            errors.push(`لم يتم تحديد AM/PM للمجموعة ${classCode}`);
            continue;
          }

          // Find teacher
          const teacherCode = classCode.split('_')[0];
          const teacher = teachers?.find(t => t.teacher_code === teacherCode);
          if (!teacher) {
            errors.push(`لم يتم العثور على المعلم برمز ${teacherCode}`);
            continue;
          }

          // Parse days and time
          const daysPart = classCode.split('_')[1];
          const timePart = classCode.split('_')[2];
          const timeHour = parseInt(timePart);
          const actualHour = finalAmPm === 'PM' && timeHour !== 12 ? timeHour + 12 : 
                           finalAmPm === 'AM' && timeHour === 12 ? 0 : timeHour;

          let daysArray: string[] = [];
          switch (daysPart) {
            case 'SAT':
              daysArray = ['saturday', 'monday', 'wednesday'];
              break;
            case 'SUN':
              daysArray = ['sunday', 'tuesday', 'thursday'];
              break;
            case 'MON':
              daysArray = ['monday', 'wednesday', 'friday'];
              break;
            default:
              daysArray = [daysPart.toLowerCase()];
          }

          // Find or create booking
          const startTime = `${actualHour.toString().padStart(2, '0')}:00:00`;
          const fullClassCode = `${classCode}_${finalAmPm}`;

          // First, find existing booking with this class code
          const { data: existingBookings } = await supabase
            .from('bookings')
            .select('*')
            .eq('class_code', fullClassCode);

          let booking;
          if (existingBookings && existingBookings.length > 0) {
            booking = existingBookings[0];
            
            // Handle delete mode - clear existing data but keep student basic info
            if (data.mode === 'delete') {
              // Get existing registrations to clean up related data
              const { data: existingRegistrations } = await supabase
                .from('student_registrations')
                .select('id')
                .eq('booking_id', booking.id);

              if (existingRegistrations && existingRegistrations.length > 0) {
                const registrationIds = existingRegistrations.map(r => r.id);
                
                // Delete payment records first (due to foreign key constraints)
                await supabase
                  .from('payment_records')
                  .delete()
                  .in('student_registration_id', registrationIds);

                // Delete attendance records
                await supabase
                  .from('attendance_records')
                  .delete()
                  .in('student_registration_id', registrationIds);

                // Delete student registrations
                await supabase
                  .from('student_registrations')
                  .delete()
                  .eq('booking_id', booking.id);
              }
            }
            // For append mode, we don't delete existing data
          } else {
            // Create new booking if not exists
            const hallSelection = data.hallSelections.find(h => h.classCode === classCode);
            const selectedHall = hallSelection ? halls?.find(h => h.id === hallSelection.selectedHallId) : halls?.[0];
            
            if (!selectedHall) {
              errors.push(`لا توجد قاعة محددة للمجموعة ${classCode}`);
              continue;
            }

            // Get current user for created_by field
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) {
              errors.push('غير مصرح بالعملية');
              continue;
            }

            // Get first academic stage as default
            const { data: academicStages } = await supabase
              .from('academic_stages')
              .select('id')
              .limit(1);

            const defaultStageId = academicStages?.[0]?.id;
            if (!defaultStageId) {
              errors.push('لا توجد مراحل دراسية متاحة');
              continue;
            }

            const { data: newBooking, error: bookingError } = await supabase
              .from('bookings')
              .insert({
                teacher_id: teacher.id,
                hall_id: selectedHall.id,
                academic_stage_id: defaultStageId,
                number_of_students: classData.students.length,
                start_time: startTime,
                start_date: new Date().toISOString().split('T')[0],
                days_of_week: daysArray,
                class_code: fullClassCode,
                status: 'active' as const,
                created_by: user.user.id
              })
              .select()
              .single();

            if (bookingError) {
              errors.push(`خطأ في إنشاء الحجز للمجموعة ${classCode}: ${bookingError.message}`);
              continue;
            }
            booking = newBooking;
          }

          // Process students for this class
          for (const studentData of classData.students) {
            try {
              setProgress(prev => prev ? {
                ...prev,
                processed: processedSteps + 1,
                currentStep: `معالجة الطالب ${studentData.name}...`
              } : null);

              // Find existing student by mobile number
              const { data: existingStudents } = await supabase
                .from('students')
                .select('*')
                .eq('mobile_phone', studentData.mobile);

              let student;
              if (existingStudents && existingStudents.length > 0) {
                student = existingStudents[0];
              } else {
                // Create new student using the students API that handles serial number generation
                try {
                  const newStudent = await studentsApi.create({
                    name: studentData.name,
                    mobile_phone: studentData.mobile,
                    parent_phone: studentData.home || undefined,
                    city: studentData.city || undefined
                  });
                  student = newStudent;

                } catch (studentError: any) {
                  errors.push(`خطأ في إنشاء الطالب ${studentData.name}: ${studentError.message}`);
                  processedSteps++;
                  continue;
                }
              }

              // Check if student is already registered in this class (for append mode)
              let registration;
              if (data.mode === 'append') {
                const { data: existingRegistration } = await supabase
                  .from('student_registrations')
                  .select('*')
                  .eq('student_id', student.id)
                  .eq('booking_id', booking.id)
                  .single();

                if (existingRegistration) {
                  registration = existingRegistration;
                  // Update existing registration if needed
                  const { error: updateError } = await supabase
                    .from('student_registrations')
                    .update({
                      total_fees: booking.class_fees || 0, // Use class fees, not from Excel
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', registration.id);

                  if (updateError) {
                    errors.push(`خطأ في تحديث تسجيل الطالب ${studentData.name}: ${updateError.message}`);
                  }
                } else {
                  // Create new registration for append mode
                  const { data: newRegistration, error: regError } = await supabase
                    .from('student_registrations')
                    .insert({
                      student_id: student.id,
                      booking_id: booking.id,
                      total_fees: booking.class_fees || 0, // Use class fees, not from Excel
                      payment_status: 'pending'
                    })
                    .select()
                    .single();

                  if (regError) {
                    errors.push(`خطأ في تسجيل الطالب ${studentData.name}: ${regError.message}`);
                    processedSteps++;
                    continue;
                  }
                  registration = newRegistration;
                }
              } else {
                // Create new registration for delete mode (fresh start)
                const { data: newRegistration, error: regError } = await supabase
                  .from('student_registrations')
                  .insert({
                    student_id: student.id,
                    booking_id: booking.id,
                    total_fees: booking.class_fees || 0, // Use class fees, not from Excel
                    payment_status: 'pending'
                  })
                  .select()
                  .single();

                if (regError) {
                  errors.push(`خطأ في تسجيل الطالب ${studentData.name}: ${regError.message}`);
                  processedSteps++;
                  continue;
                }
                registration = newRegistration;
              }

              // Create payment record if "dars" payment amount is provided
              if (studentData.darsPayment && studentData.darsPayment > 0 && registration) {
                const { error: paymentError } = await supabase
                  .from('payment_records')
                  .insert({
                    student_registration_id: registration.id,
                    amount: studentData.darsPayment,
                    payment_date: new Date().toISOString().split('T')[0],
                    payment_method: 'cash',
                    notes: 'مستورد من ملف Excel - عمود Dars'
                  });

                if (paymentError) {
                  errors.push(`خطأ في إضافة دفعة للطالب ${studentData.name}: ${paymentError.message}`);
                }
              }

              processedSteps++;
            } catch (error) {
              errors.push(`خطأ في معالجة الطالب ${studentData.name}: ${error}`);
              processedSteps++;
            }
          }
        } catch (error) {
          errors.push(`خطأ في معالجة المجموعة ${classData.sheetName}: ${error}`);
        }
      }

      setProgress(prev => prev ? { ...prev, errors, currentStep: 'تم الانتهاء' } : null);
      return { success: true, errors };
    },
    onSuccess: (result) => {
      toast({
        title: "تم رفع البيانات بنجاح",
        description: `تم معالجة البيانات ${result.errors.length > 0 ? 'مع بعض الأخطاء' : 'بنجاح'}`,
      });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student-registrations'] });
      
      // Reset form after delay
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(null);
        setFile(null);
        setParsedData([]);
        setErrors([]);
        setAmPmClarifications([]);
        setOpen(false);
      }, 3000);
    },
    onError: (error) => {
      toast({
        title: "خطأ في رفع البيانات",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const parseSheetName = (sheetName: string): { teacher?: string; days?: string; time?: string; amPm?: string; needsAmPmClarification: boolean } => {
    const parts = sheetName.split('_');
    if (parts.length >= 3) {
      const teacher = parts[0];
      const days = parts[1];
      const time = parts[2];
      const amPm = parts[3]; // Should be AM or PM in new format
      
      // Check if AM/PM is explicitly provided
      const hasValidAmPm = amPm && (amPm.toUpperCase() === 'AM' || amPm.toUpperCase() === 'PM');
      
      return {
        teacher,
        days,
        time,
        amPm: hasValidAmPm ? amPm.toUpperCase() : undefined,
        needsAmPmClarification: !hasValidAmPm
      };
    }
    return { needsAmPmClarification: true };
  };

  const normalizeMobileNumber = (mobile: any): string => {
    if (!mobile) return '';
    return mobile.toString().replace(/\D/g, '');
  };

  const getDarsPaymentValue = (row: any): number => {
    // Accept any valid numeric payment amount from Dars-related columns; return 0 for blanks/non-numeric
    const parseNumeric = (val: any): number => {
      if (val === undefined || val === null) return 0;
      if (typeof val === 'number') return isNaN(val) ? 0 : Math.max(0, val);
      const cleaned = val.toString().trim();
      if (cleaned === '') return 0;
      // Remove all non-digit characters (allow decimal comma/point)
      const normalized = cleaned.replace(/[^0-9.,-]/g, '').replace(/,/g, '.');
      const num = parseFloat(normalized);
      return isNaN(num) ? 0 : Math.max(0, num);
    };

    if (Array.isArray(row)) {
      // Try columns from index 5 onwards (after name, mobile, home, city)
      for (let i = 5; i < row.length; i++) {
        const value = row[i];
        if (value !== undefined && value !== null && value !== '') {
          const num = parseNumeric(value);
          if (num > 0) return num;
        }
      }
      return 0;
    }

    // For object format - look for any key containing "dars" (case-insensitive)
    for (const key in row) {
      if (key && key.toLowerCase().includes('dars')) {
        const num = parseNumeric(row[key]);
        if (num > 0) return num;
      }
    }

    return 0;
  };

  const processFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const parsedSheets: ParsedClassData[] = [];
      const clarificationsNeeded: AmPmClarification[] = [];
      const newErrors: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        try {
          const worksheet = workbook.Sheets[sheetName];
          
          if (!worksheet) {
            newErrors.push(`لا يمكن قراءة الورقة "${sheetName}"`);
            continue;
          }
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (!Array.isArray(jsonData) || jsonData.length < 2) {
            newErrors.push(`الورقة "${sheetName}" فارغة أو لا تحتوي على بيانات كافية`);
            continue;
          }

          console.log(`Processing sheet: ${sheetName}`);
          console.log(`First few rows:`, jsonData.slice(0, 3));
          
          // Always use fixed column positions based on your Excel structure
          // A=0(index), B=1(Name), C=2(Mobile), D=3(Home), E=4(City), etc.
          const nameColumn = 1;  // Column B
          const mobileColumn = 2; // Column C  
          const homeColumn = 3;   // Column D
          const cityColumn = 4;   // Column E
          
          // Find the first row with actual data (skip empty rows)
          let dataStartRow = 1; // Start from row 2 (index 1)
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (row && row[nameColumn] && row[nameColumn].toString().trim()) {
              dataStartRow = i;
              break;
            }
          }
          
          console.log(`Data starts at row: ${dataStartRow + 1} (index ${dataStartRow})`);
          
          // Validate that we have enough columns
          const firstDataRow = jsonData[dataStartRow] as any[];
          if (!firstDataRow || firstDataRow.length < 3) {
            newErrors.push(`الورقة "${sheetName}" لا تحتوي على أعمدة كافية`);
            continue;
          }

          const students: StudentDataRow[] = [];
          // Process data starting from the identified data start row
          for (let i = dataStartRow; i < jsonData.length; i++) {
            try {
              const row = jsonData[i] as any[];
              if (!Array.isArray(row) || !row[nameColumn] || !row[mobileColumn]) {
                continue; // Skip invalid or empty rows
              }
              
              const mobile = normalizeMobileNumber(row[mobileColumn]);
              if (!mobile) {
                continue; // Skip rows with invalid mobile numbers
              }
              
              const name = row[nameColumn]?.toString()?.trim();
              if (!name) {
                continue; // Skip rows with empty names
              }
              
                              students.push({
                  name,
                  mobile,
                  home: row[homeColumn] ? row[homeColumn].toString().trim() : undefined,
                  city: row[cityColumn] ? row[cityColumn].toString().trim() : undefined,
                  darsPayment: getDarsPaymentValue(row) // Extract payment from "dars" column
                });
            } catch (rowError) {
              // Log the error but continue processing other rows
              console.warn(`Error processing row ${i + 1} in sheet ${sheetName}:`, rowError);
            }
          }

          if (students.length === 0) {
            newErrors.push(`الورقة "${sheetName}" لا تحتوي على طلاب صالحين`);
            continue;
          }

          const parseResult = parseSheetName(sheetName);
          const classData: ParsedClassData = {
            sheetName,
            ...parseResult,
            students
          };

          parsedSheets.push(classData);

          // Check if AM/PM clarification is needed
          if (parseResult.needsAmPmClarification) {
            clarificationsNeeded.push({
              classCode: sheetName,
              options: ['AM', 'PM']
            });
          }
        } catch (error) {
          newErrors.push(`خطأ في معالجة الورقة "${sheetName}": ${error}`);
        }
      }

      setParsedData(parsedSheets);
      setErrors(newErrors);
      setAmPmClarifications(clarificationsNeeded);

      // Generate hall selections for all classes
      const hallSelectionsNeeded: HallSelection[] = parsedSheets.map(sheet => ({
        classCode: sheet.sheetName,
        availableHalls: halls || [],
        selectedHallId: halls?.[0]?.id // Default to first hall
      }));
      
      setHallSelections(hallSelectionsNeeded);

      if (clarificationsNeeded.length > 0) {
        setShowClarificationDialog(true);
      } else if (hallSelectionsNeeded.length > 0) {
        setShowHallSelectionDialog(true);
      } else {
        // Show upload mode selection dialog if no other dialogs are needed
        setShowUploadModeDialog(true);
      }

    } catch (error) {
      console.error('File processing error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setErrors([`خطأ في قراءة الملف: ${errorMessage}. تأكد من أن الملف Excel صالح.`]);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const handleAmPmSelection = (classCode: string, selection: 'AM' | 'PM') => {
    setAmPmClarifications(prev => 
      prev.map(clarification => 
        clarification.classCode === classCode 
          ? { ...clarification, selected: selection }
          : clarification
      )
    );
  };

  const handleHallSelection = (classCode: string, hallId: string) => {
    setHallSelections(prev => 
      prev.map(selection => 
        selection.classCode === classCode 
          ? { ...selection, selectedHallId: hallId }
          : selection
      )
    );
  };

  const handleUploadModeSelection = (mode: UploadMode) => {
    setUploadMode(mode);
    setShowUploadModeDialog(false);
  };

  const canProceedWithUpload = () => {
    return parsedData.length > 0 && 
           amPmClarifications.every(c => c.selected) && 
           hallSelections.every(h => h.selectedHallId) &&
           errors.length === 0;
  };

  const handleUpload = () => {
    if (canProceedWithUpload()) {
      setShowClarificationDialog(false);
      setShowHallSelectionDialog(false);
      uploadMutation.mutate({ parsedData, clarifications: amPmClarifications, hallSelections, mode: uploadMode });
    }
  };

  const handleAmPmNext = () => {
    if (amPmClarifications.every(c => c.selected)) {
      setShowClarificationDialog(false);
      if (hallSelections.length > 0) {
        setShowHallSelectionDialog(true);
      } else {
        setShowUploadModeDialog(true);
      }
    }
  };

  const handleHallSelectionNext = () => {
    if (hallSelections.every(h => h.selectedHallId)) {
      setShowHallSelectionDialog(false);
      setShowUploadModeDialog(true);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setProgress(null);
    setIsProcessing(false);
    setAmPmClarifications([]);
    setShowClarificationDialog(false);
    setHallSelections([]);
    setShowHallSelectionDialog(false);
    setUploadMode('append');
    setShowUploadModeDialog(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">رفع ملف Excel للمجموعات</DialogTitle>
        </DialogHeader>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              تعليمات الرفع
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• يجب أن يحتوي الملف على ورقة منفصلة لكل مجموعة</p>
            <p>• اسم الورقة يجب أن يكون بتنسيق: B_SAT_1_PM أو B_SAT_1_AM</p>
            <p>• B=المعلم، SAT=اليوم، 1=الساعة، PM/AM=مساءً/صباحاً</p>
            <p>• كل ورقة يجب أن تحتوي على أعمدة: Name (الاسم)، Mobile (الموبايل)</p>
            <p>• أعمدة اختيارية: Home (هاتف المنزل)، City (المدينة)، Dars (المدفوعات)</p>
            <p>• الصف الأول يجب أن يحتوي على أسماء الأعمدة</p>
            <p>• بيانات الطلاب تبدأ من الصف الثالث</p>
            <p>• إذا لم يتم تحديد AM أو PM، سيطلب منك التوضيح</p>
            <p>• يمكنك اختيار حذف البيانات الموجودة أو الإضافة إليها</p>
            <p>• الطلاب الموجودين بنفس رقم الموبايل لن يتم إنشاؤهم مرة أخرى</p>
            <p>• عمود "Dars" يستخدم لإضافة مدفوعات جديدة، أما الرسوم فتبقى كما هي محددة في المجموعة</p>
          </CardContent>
        </Card>

        {/* File Upload */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="file">اختر ملف Excel</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="mt-1"
            />
          </div>

          {/* Processing Progress */}
          {progress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  جاري المعالجة...
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>التقدم: {progress.processed} / {progress.total}</span>
                    <span>{Math.round((progress.processed / progress.total) * 100)}%</span>
                  </div>
                  <Progress value={(progress.processed / progress.total) * 100} />
                </div>
                <p className="text-sm text-muted-foreground">{progress.currentStep}</p>
                {progress.errors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">أخطاء:</p>
                    {progress.errors.slice(0, 5).map((error, index) => (
                      <p key={index} className="text-xs text-destructive">{error}</p>
                    ))}
                    {progress.errors.length > 5 && (
                      <p className="text-xs text-muted-foreground">و {progress.errors.length - 5} أخطاء أخرى...</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {errors.map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* AM/PM Clarification Dialog */}
          {showClarificationDialog && amPmClarifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>توضيح التوقيت (AM/PM)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  يرجى تحديد ما إذا كانت المجموعات التالية في الصباح (AM) أم المساء (PM):
                </p>
                {amPmClarifications.map((clarification) => (
                  <div key={clarification.classCode} className="flex items-center justify-between p-3 border rounded">
                    <span className="font-medium">{clarification.classCode}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={clarification.selected === 'AM' ? 'default' : 'outline'}
                        onClick={() => handleAmPmSelection(clarification.classCode, 'AM')}
                      >
                        صباحاً (AM)
                      </Button>
                      <Button
                        size="sm"
                        variant={clarification.selected === 'PM' ? 'default' : 'outline'}
                        onClick={() => handleAmPmSelection(clarification.classCode, 'PM')}
                      >
                        مساءً (PM)
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Hall Selection Dialog */}
          {showHallSelectionDialog && hallSelections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>اختيار القاعات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  يرجى اختيار القاعة المناسبة لكل مجموعة:
                </p>
                {hallSelections.map((selection) => (
                  <div key={selection.classCode} className="flex items-center justify-between p-3 border rounded">
                    <span className="font-medium">{selection.classCode}</span>
                    <div className="min-w-[200px]">
                      <Select
                        value={selection.selectedHallId || ''}
                        onValueChange={(value) => handleHallSelection(selection.classCode, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر القاعة" />
                        </SelectTrigger>
                        <SelectContent>
                          {selection.availableHalls.map((hall) => (
                            <SelectItem key={hall.id} value={hall.id}>
                              {hall.name} (سعة {hall.capacity} طالب)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Upload Mode Selection Dialog */}
          {showUploadModeDialog && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  اختيار طريقة الرفع
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  كيف تريد التعامل مع البيانات الموجودة للمجموعات؟
                </p>
                <RadioGroup value={uploadMode} onValueChange={(value: UploadMode) => setUploadMode(value)}>
                  <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded">
                    <RadioGroupItem value="delete" id="delete" />
                    <Label htmlFor="delete" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4 text-red-500" />
                        <div>
                          <div className="font-medium">حذف البيانات الموجودة أولاً</div>
                          <div className="text-sm text-muted-foreground">
                            سيتم حذف جميع تسجيلات الطلاب والمدفوعات والحضور للمجموعات المحددة، مع الاحتفاظ ببيانات الطلاب الأساسية (الاسم، الموبايل، الرقم التسلسلي)
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse p-3 border rounded">
                    <RadioGroupItem value="append" id="append" />
                    <Label htmlFor="append" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="font-medium">إضافة إلى البيانات الموجودة</div>
                          <div className="text-sm text-muted-foreground">
                            سيتم إضافة الطلاب الجدد وتحديث المدفوعات للطلاب الموجودين بالفعل
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>ملاحظة مهمة:</strong> الرسوم (class fees) تبقى كما هي محددة في إعدادات المجموعة ولن يتم تغييرها من ملف Excel. 
                    أما عمود "Dars" في Excel فسيتم استخدامه لإضافة مدفوعات جديدة للطلاب.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Data Preview */}
          {parsedData.length > 0 && !showClarificationDialog && !showHallSelectionDialog && !showUploadModeDialog && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  معاينة البيانات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {parsedData.map((classData, index) => (
                    <div key={index} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{classData.sheetName}</h4>
                        <Badge variant="secondary">{classData.students.length} طالب</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        المعلم: {classData.teacher} | الأيام: {classData.days} | الوقت: {classData.time} {classData.amPm || amPmClarifications.find(c => c.classCode === classData.sheetName)?.selected}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            إلغاء
          </Button>
          {showClarificationDialog ? (
            <Button 
              onClick={handleAmPmNext}
              disabled={!amPmClarifications.every(c => c.selected) || isProcessing}
              className="bg-primary hover:bg-primary/90"
            >
              التالي
            </Button>
          ) : showHallSelectionDialog ? (
            <Button 
              onClick={handleHallSelectionNext}
              disabled={!hallSelections.every(h => h.selectedHallId) || isProcessing}
              className="bg-primary hover:bg-primary/90"
            >
              التالي
            </Button>
          ) : showUploadModeDialog ? (
            <Button 
              onClick={() => {
                setShowUploadModeDialog(false);
              }}
              disabled={isProcessing}
              className="bg-primary hover:bg-primary/90"
            >
              التالي
            </Button>
          ) : (
            parsedData.length > 0 && !isProcessing && errors.length === 0 && (
              <Button 
                onClick={handleUpload}
                className="bg-primary hover:bg-primary/90"
              >
                <Upload className="h-4 w-4 mr-2" />
                رفع البيانات
              </Button>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};