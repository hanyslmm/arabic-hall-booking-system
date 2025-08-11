import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Student } from '@/api/students';
import { QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

interface StudentQRCodeModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StudentQRCodeModal({ student, isOpen, onClose }: StudentQRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleDownload = () => {
    if (!canvasRef.current || !student) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-${student.serial_number || 'qr'}.png`;
    a.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            رمز QR للطالب
          </DialogTitle>
        </DialogHeader>
        <Card>
          <CardContent className="p-4 flex flex-col items-center gap-4">
            {student ? (
              <>
                <div className="text-center">
                  <div className="font-medium">{student.name}</div>
                  <div className="text-sm text-muted-foreground">رقم: {student.serial_number}</div>
                </div>
                <QRCodeCanvas
                  id="student-qr"
                  value={student.serial_number}
                  size={220}
                  level="H"
                  includeMargin
                  ref={canvasRef as any}
                />
                <div className="flex gap-2">
                  <Button onClick={handleDownload}>تحميل كصورة</Button>
                  <Button variant="outline" onClick={onClose}>إغلاق</Button>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">لا يوجد طالب محدد</div>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}