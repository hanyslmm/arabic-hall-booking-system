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
import { Upload, AlertCircle, CheckCircle, Clock, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

interface BulkUploadModalProps {
  children: React.ReactNode;
}

interface TeacherDataRow {
  name: string;
  mobile_phone?: string;
  subject?: string;
}

interface ProcessingProgress {
  total: number;
  processed: number;
  currentStep: string;
  errors: string[];
}

export const BulkUploadModal = ({ children }: BulkUploadModalProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<TeacherDataRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch subjects for reference
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*');
      if (error) throw error;
      return data;
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (teachersData: TeacherDataRow[]) => {
      setIsProcessing(true);
      const totalSteps = teachersData.length;
      let processedSteps = 0;

      setProgress({
        total: totalSteps,
        processed: 0,
        currentStep: 'بدء معالجة المعلمين...',
        errors: []
      });

      const errors: string[] = [];

      // Get current user for created_by field
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('غير مصرح بالعملية');
      }

      for (const teacherData of teachersData) {
        try {
          setProgress(prev => prev ? {
            ...prev,
            processed: processedSteps + 1,
            currentStep: `معالجة المعلم ${teacherData.name}...`
          } : null);

          // Check if teacher already exists by mobile phone
          if (teacherData.mobile_phone) {
            const { data: existingTeachers } = await supabase
              .from('teachers')
              .select('*')
              .eq('mobile_phone', teacherData.mobile_phone);

            if (existingTeachers && existingTeachers.length > 0) {
              errors.push(`المعلم ${teacherData.name} موجود بالفعل برقم الهاتف ${teacherData.mobile_phone}`);
              processedSteps++;
              continue;
            }
          }

          // Find subject by name if provided
          let subjectId = null;
          if (teacherData.subject && subjects) {
            const subject = subjects.find(s => 
              s.name.toLowerCase().trim() === teacherData.subject.toLowerCase().trim()
            );
            if (subject) {
              subjectId = subject.id;
            } else {
              errors.push(`لم يتم العثور على المادة "${teacherData.subject}" للمعلم ${teacherData.name}`);
            }
          }

          // Create teacher
          const { error: teacherError } = await supabase
            .from('teachers')
            .insert({
              name: teacherData.name,
              mobile_phone: teacherData.mobile_phone || null,
              subject_id: subjectId,
              created_by: user.user.id
            });

          if (teacherError) {
            errors.push(`خطأ في إنشاء المعلم ${teacherData.name}: ${teacherError.message}`);
          }

          processedSteps++;
        } catch (error) {
          errors.push(`خطأ في معالجة المعلم ${teacherData.name}: ${error}`);
          processedSteps++;
        }
      }

      setProgress(prev => prev ? { ...prev, errors, currentStep: 'تم الانتهاء' } : null);
      return { success: true, errors };
    },
    onSuccess: (result) => {
      toast({
        title: "تم رفع بيانات المعلمين بنجاح",
        description: `تم معالجة ${parsedData.length} معلم ${result.errors.length > 0 ? 'مع بعض الأخطاء' : 'بنجاح'}`,
      });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      
      // Reset form after delay
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(null);
        setFile(null);
        setParsedData([]);
        setErrors([]);
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

  const normalizeMobileNumber = (mobile: any): string => {
    if (!mobile) return '';
    return mobile.toString().replace(/\D/g, '');
  };

  const processFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]; // Use first sheet
      
      if (!worksheet) {
        setErrors(['لا يمكن قراءة الملف']);
        return;
      }
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (!Array.isArray(jsonData) || jsonData.length < 2) {
        setErrors(['الملف فارغ أو لا يحتوي على بيانات كافية']);
        return;
      }

      // Expected columns: Name (A), Mobile (B), Subject (C)
      const nameColumn = 0;  // Column A
      const mobileColumn = 1; // Column B  
      const subjectColumn = 2; // Column C
      
      // Find the first row with actual data (skip header)
      let dataStartRow = 1; // Start from row 2 (index 1)
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (row && row[nameColumn] && row[nameColumn].toString().trim()) {
          dataStartRow = i;
          break;
        }
      }
      
      const teachers: TeacherDataRow[] = [];
      const newErrors: string[] = [];
      
      // Process data starting from the identified data start row
      for (let i = dataStartRow; i < jsonData.length; i++) {
        try {
          const row = jsonData[i] as any[];
          if (!Array.isArray(row) || !row[nameColumn]) {
            continue; // Skip invalid or empty rows
          }
          
          const name = row[nameColumn]?.toString()?.trim();
          if (!name) {
            continue; // Skip rows with empty names
          }
          
          const mobile = row[mobileColumn] ? normalizeMobileNumber(row[mobileColumn]) : undefined;
          const subject = row[subjectColumn] ? row[subjectColumn].toString().trim() : undefined;
          
          teachers.push({
            name,
            mobile_phone: mobile,
            subject
          });
        } catch (rowError) {
          console.warn(`Error processing row ${i + 1}:`, rowError);
        }
      }

      if (teachers.length === 0) {
        newErrors.push('الملف لا يحتوي على معلمين صالحين');
      }

      setParsedData(teachers);
      setErrors(newErrors);

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

  const downloadTemplate = () => {
    const templateData = [
      {
        'Name': 'أحمد محمد',
        'Mobile': '01012345678',
        'Subject': 'الرياضيات'
      },
      {
        'Name': 'فاطمة علي',
        'Mobile': '01098765432',
        'Subject': 'العلوم'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Teachers');
    XLSX.writeFile(wb, 'teachers_template.xlsx');
  };

  const canProceedWithUpload = () => {
    return parsedData.length > 0 && errors.length === 0;
  };

  const handleUpload = () => {
    if (canProceedWithUpload()) {
      uploadMutation.mutate(parsedData);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setProgress(null);
    setIsProcessing(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">رفع ملف Excel للمعلمين</DialogTitle>
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
            <p>• يجب أن يحتوي الملف على ثلاثة أعمدة: Name (الاسم)، Mobile (الموبايل)، Subject (المادة)</p>
            <p>• الصف الأول يجب أن يحتوي على أسماء الأعمدة</p>
            <p>• بيانات المعلمين تبدأ من الصف الثاني</p>
            <p>• عمود الاسم مطلوب، بينما الموبايل والمادة اختياريان</p>
            <p>• إذا كان رقم الموبايل موجود مسبقاً، سيتم تخطي المعلم</p>
            <p>• إذا لم توجد المادة المحددة، سيتم إنشاء المعلم بدون مادة</p>
          </CardContent>
        </Card>

        {/* File Upload */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
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
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={downloadTemplate}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                تحميل النموذج
              </Button>
            </div>
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

          {/* Data Preview */}
          {parsedData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  معاينة البيانات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">سيتم إضافة {parsedData.length} معلم:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {parsedData.slice(0, 10).map((teacher, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                        <span className="font-medium">{teacher.name}</span>
                        <div className="flex gap-2">
                          {teacher.mobile_phone && (
                            <Badge variant="outline">{teacher.mobile_phone}</Badge>
                          )}
                          {teacher.subject && (
                            <Badge variant="secondary">{teacher.subject}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {parsedData.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center">و {parsedData.length - 10} معلم آخر...</p>
                    )}
                  </div>
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
          {parsedData.length > 0 && !isProcessing && errors.length === 0 && (
            <Button 
              onClick={handleUpload}
              className="bg-primary hover:bg-primary/90"
            >
              <Upload className="h-4 w-4 mr-2" />
              رفع بيانات المعلمين
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};