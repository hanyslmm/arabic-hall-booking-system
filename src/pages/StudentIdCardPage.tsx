import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { studentsApi } from '@/api/students';
import { QRCodeCanvas } from 'qrcode.react';

export default function StudentIdCardPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { data: student } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      return await studentsApi.getById(studentId);
    },
    enabled: !!studentId,
  });

  useEffect(() => {
    // Auto print when ready
    if (student) {
      setTimeout(() => window.print(), 300);
    }
  }, [student]);

  if (!student) return null;

  return (
    <div className="min-h-screen p-6 bg-white print:bg-white">
      <style>
        {`
        @page { size: A6; margin: 10mm; }
        @media print {
          .no-print { display: none; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .card {
          width: 320px;
          height: 200px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          align-items: center;
        }
        .title { font-weight: 700; font-size: 14px; }
        .sub { color: #6b7280; font-size: 12px; }
        `}
      </style>
      <div className="card">
        <div>
          <div className="title">{student.name}</div>
          <div className="sub">رقم الطالب: {student.serial_number}</div>
        </div>
        <div className="flex justify-center">
          <QRCodeCanvas
            value={student.serial_number}
            size={120}
            level="H"
            includeMargin
            ref={canvasRef as any}
          />
        </div>
      </div>
      <div className="no-print mt-4">
        <button onClick={() => window.print()} className="rounded bg-black text-white px-3 py-1">طباعة</button>
      </div>
    </div>
  );
}