import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { UnifiedLayout } from '@/components/layout/UnifiedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { studentsApi, Student } from '@/api/students';
import { StudentQRCodeModal } from '@/components/student/StudentQRCodeModal';
import { Phone, MapPin, Calendar, QrCode, Printer, ArrowLeft } from 'lucide-react';
import { formatShortArabicDate } from '@/utils/dateUtils';

export default function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);

  const { data: student, isLoading, error } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      return await studentsApi.getById(studentId);
    },
    enabled: !!studentId,
  });

  if (isLoading) {
    return (
      <UnifiedLayout>
        <div className="p-6 text-center">
          <LoadingSpinner />
        </div>
      </UnifiedLayout>
    );
  }

  if (error || !student) {
    return (
      <UnifiedLayout>
        <div className="p-6 text-center">
          <p className="text-destructive">تعذر تحميل بيانات الطالب</p>
        </div>
      </UnifiedLayout>
    );
  }

  return (
    <UnifiedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 ml-2" />
              رجوع
            </Button>
            <h1 className="text-3xl font-bold">ملف الطالب</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowQR(true)} className="gap-2">
              <QrCode className="h-4 w-4" />
              عرض QR Code
            </Button>
            <Link to={`/students/${student.id}/print-card`} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2">
                <Printer className="h-4 w-4" />
                طباعة بطاقة الطالب
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="font-bold text-xl">{student.name}</span>
              <Badge variant="secondary">رقم: {student.serial_number}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">معلومات الاتصال</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">الهاتف المحمول:</span>
                    <span>{student.mobile_phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">هاتف ولي الأمر:</span>
                    <span>{student.parent_phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">المدينة:</span>
                    <span>{student.city || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">معلومات التسجيل</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">تاريخ الإنشاء:</span>
                    <span>{formatShortArabicDate(student.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {showQR && (
          <StudentQRCodeModal
            student={student as Student}
            isOpen={showQR}
            onClose={() => setShowQR(false)}
          />
        )}
      </div>
    </UnifiedLayout>
  );
}