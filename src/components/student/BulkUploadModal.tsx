import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (students: BulkStudentData[]) => void;
  defaultClassFees?: number;
}

interface BulkStudentData {
  name: string;
  mobile: string;
  home: string; // parent mobile
  city: string;
  class: string;
  payment: number;
}

export function BulkUploadModal({ isOpen, onClose, onUpload, defaultClassFees = 0 }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<BulkStudentData[]>([]);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const templateData = [
      {
        'Name': 'أحمد محمد',
        'Mobile': '01012345678',
        'Home': '01098765432',
        'City': 'القاهرة',
        'Class': 'الفصل الأول',
        'Payment': defaultClassFees
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'bulk_students_template.xlsx');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const normalizeMobileNumber = (mobile: string): string => {
    if (!mobile) return '';
    
    // Remove all non-digit characters
    const digits = mobile.toString().replace(/\D/g, '');
    
    // Add 0 at the beginning if not present
    if (digits.length === 10 && !digits.startsWith('0')) {
      return '0' + digits;
    }
    
    return digits;
  };

  const normalizeCityName = (city: string): string => {
    if (!city) return '';
    
    const cityLower = city.toString().toLowerCase().trim();
    
    // Normalize common city names
    if (cityLower.includes('mit') && cityLower.includes('ghamr')) {
      return 'Mit Ghamr';
    }
    if (cityLower.includes('zifta') || cityLower.includes('zefta')) {
      return 'Zifta';
    }
    if (cityLower.includes('daqados') || cityLower.includes('daqa')) {
      return 'Daqados';
    }
    
    return city.toString().trim();
  };

  const convertToNumber = (value: unknown): number => {
    if (value === null || value === undefined || value === '') return 0;
    
    // Convert to string first and remove spaces
    const cleanValue = value.toString().trim().replace(/\s+/g, '');
    
    const num = Number(cleanValue);
    return isNaN(num) ? 0 : Math.max(0, num);
  };

  const getPaymentValue = (row: Record<string, unknown>): number => {
    // Check multiple possible column names for payment
    const possiblePaymentColumns = [
      'Payment', 'payment', 'المدفوع', 'مدفوع', 'الدفع', 'دفع', 
      'Amount', 'amount', 'Fee', 'fee', 'Fees', 'fees'
    ];
    
    for (const col of possiblePaymentColumns) {
      if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
        return convertToNumber(row[col]);
      }
    }
    
    return 0;
  };

  const processFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const processedData: BulkStudentData[] = [];
      const errorList: string[] = [];

      jsonData.forEach((row: Record<string, unknown>, index: number) => {
        const rowNumber = index + 2; // +2 because Excel rows start at 1 and we have header
        
        // Skip rows without names (ignore completely)
        if (!row.Name || !row.Name.toString().trim()) {
          return; // Skip this row entirely
        }

        // Process and normalize the data
        const name = row.Name.toString().trim();
        const mobile = normalizeMobileNumber(row.Mobile);
        const home = normalizeMobileNumber(row.Home);
        const city = normalizeCityName(row.City);
        const payment = getPaymentValue(row);

        // Validate mobile numbers (Egyptian format) after normalization - show warnings only
        const mobileRegex = /^01[0-9]{9}$/;
        if (mobile && !mobileRegex.test(mobile)) {
          errorList.push(`تحذير - الصف ${rowNumber}: رقم الموبايل قد يكون غير صحيح "${mobile}" (يفضل أن يبدأ بـ 01 ويكون 11 رقم)`);
        }
        if (home && !mobileRegex.test(home)) {
          errorList.push(`تحذير - الصف ${rowNumber}: رقم ولي الأمر قد يكون غير صحيح "${home}" (يفضل أن يبدأ بـ 01 ويكون 11 رقم)`);
        }

        // Only add to processed data if we have at least a name
        processedData.push({
          name: name,
          mobile: mobile,
          home: home,
          city: city,
          class: row.Class?.toString().trim() || '',
          payment: payment
        });
      });

      setErrors(errorList);
      setPreviewData(processedData);

      if (errorList.length === 0) {
        toast({ title: 'تم تحميل الملف بنجاح', description: `تم العثور على ${processedData.length} طالب` });
      } else {
        toast({ 
          title: 'تحذير', 
          description: `تم العثور على ${errorList.length} خطأ في البيانات`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      setErrors(['خطأ في قراءة الملف. تأكد من أن الملف Excel صالح.']);
      toast({ title: 'خطأ في تحميل الملف', variant: 'destructive' });
    }
  };

  const handleUpload = () => {
    if (previewData.length === 0) {
      toast({ title: 'لا توجد بيانات للرفع', variant: 'destructive' });
      return;
    }

    // Allow upload even with warnings
    onUpload(previewData);
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setErrors([]);
    setPreviewData([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>رفع بيانات الطلاب مجمعة</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">تحميل نموذج Excel</h3>
              <p className="text-sm text-muted-foreground">
                حمل النموذج وأدخل بيانات الطلاب: الاسم، الموبايل، رقم ولي الأمر، المدينة، الفصل، المدفوع
              </p>
            </div>
            <Button onClick={downloadTemplate} variant="outline">
              <Download className="h-4 w-4 ml-2" />
              تحميل النموذج
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>رفع ملف Excel</Label>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
            />
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">تم العثور على الأخطاء التالية:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {previewData.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">معاينة البيانات ({previewData.length} طالب)</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-right p-2">الاسم</th>
                      <th className="text-right p-2">الموبايل</th>
                      <th className="text-right p-2">ولي الأمر</th>
                      <th className="text-right p-2">المدينة</th>
                      <th className="text-right p-2">الفصل</th>
                      <th className="text-right p-2">المدفوع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((student, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{student.name}</td>
                        <td className="p-2">{student.mobile}</td>
                        <td className="p-2">{student.home}</td>
                        <td className="p-2">{student.city}</td>
                        <td className="p-2">{student.class}</td>
                        <td className="p-2">{student.payment} جنيه</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="p-2 text-center text-sm text-muted-foreground border-t">
                    ... و {previewData.length - 10} طالب آخرين
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 space-x-reverse">
            <Button variant="outline" onClick={handleClose}>
              إلغاء
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={previewData.length === 0}
            >
              <Upload className="h-4 w-4 ml-2" />
              رفع البيانات
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}