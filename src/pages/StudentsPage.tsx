import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UnifiedLayout } from "@/components/layout/UnifiedLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { AddStudentModal } from "@/components/student/AddStudentModal";
import { EditStudentModal } from "@/components/student/EditStudentModal";
import { BulkUploadModal } from "@/components/student/BulkUploadModal";
import { studentsApi, Student } from "@/api/students";
import { Plus, Search, Scan, Upload, Edit, Trash2, Users, Phone, MapPin, Calendar, QrCode } from "lucide-react";
import { toast } from "sonner";
import { formatShortArabicDate } from "@/utils/dateUtils";
import { MobileResponsiveTable, TableColumn, TableAction } from "@/components/common/MobileResponsiveTable";
import { Scanner } from '@alzera/react-scanner';
import { useDebounce } from '@/hooks/useDebounce';
import { StudentQRCodeModal } from '@/components/student/StudentQRCodeModal';

const PAGE_SIZE = 50;
const StudentsPage = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [confirmDeleteStudent, setConfirmDeleteStudent] = useState<Student | null>(null);
  const [qrStudent, setQrStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["students", page, debouncedSearch],
    queryFn: async () => {
      return await studentsApi.getPaginated({ page, pageSize: PAGE_SIZE, searchTerm: debouncedSearch || undefined });
    },
    placeholderData: (previousData) => previousData,
  });
  const students = (data as any)?.data || [];
  const total = (data as any)?.total || 0;

  const searchMutation = useMutation({
    mutationFn: studentsApi.search,
    onSuccess: (searchResults) => {
      // For compatibility; but main list uses server-side search via debouncedSearch
      queryClient.setQueryData(["students", page, debouncedSearch], { data: searchResults, total: searchResults.length });
    },
    onError: () => {
      toast.error("فشل في البحث عن الطالب");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: studentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("تم حذف الطالب بنجاح");
    },
    onError: () => {
      toast.error("فشل في حذف الطالب");
    }
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async (students: any[]) => {
      const results = [];
      for (const studentData of students) {
        const student = await studentsApi.create({
          name: studentData.name,
          mobile_phone: studentData.mobile,
          parent_phone: studentData.home,
          city: studentData.city,
        });
        results.push(student);
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success(`تم إضافة ${results.length} طالب بنجاح`);
    },
    onError: () => {
      toast.error("فشل في رفع بيانات الطلاب");
    }
  });

  const handleSearch = () => {
    setPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const resetSearch = () => {
    setSearchTerm("");
    setPage(1);
  };

  const canManageStudents = profile?.user_role && ['owner', 'manager'].includes(profile.user_role);

  // Define table columns with mobile optimization
  const studentColumns: TableColumn<Student>[] = [
    {
      key: 'serial_number',
      header: 'الرقم التسلسلي',
      mobileLabel: 'الرقم',
      render: (student) => (
        <Badge variant="secondary">{student.serial_number}</Badge>
      ),
    },
    {
      key: 'name',
      header: 'الاسم',
      mobileLabel: 'الاسم',
      render: (student) => (
        <span className="font-medium">{student.name}</span>
      ),
    },
    {
      key: 'mobile_phone',
      header: 'رقم الهاتف',
      mobileLabel: 'الهاتف',
      render: (student) => (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground sm:inline hidden" />
          {student.mobile_phone}
        </div>
      ),
    },
    {
      key: 'city',
      header: 'المدينة',
      mobileLabel: 'المدينة',
      hideOnMobile: true,
      render: (student) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {student.city || '-'}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'تاريخ التسجيل',
      mobileLabel: 'التاريخ',
      hideOnMobile: true,
      render: (student) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {formatShortArabicDate(student.created_at)}
        </div>
      ),
    },
  ];

  // Table actions for edit/delete
  const baseActions: TableAction<Student>[] = [
    {
      label: 'QR',
      onClick: (student) => setQrStudent(student),
      variant: 'outline',
      size: 'sm',
      icon: <QrCode className="h-4 w-4" />,
    },
  ];

  const manageActions: TableAction<Student>[] = canManageStudents ? [
    {
      label: 'تعديل',
      onClick: (student) => setEditingStudent(student),
      variant: 'outline',
      size: 'sm',
      icon: <Edit className="h-4 w-4" />,
    },
    {
      label: 'حذف',
      onClick: (student) => setConfirmDeleteStudent(student),
      variant: 'destructive',
      size: 'sm',
      icon: <Trash2 className="h-4 w-4" />,
    },
  ] : [];

  const studentActions: TableAction<Student>[] = canManageStudents ? [...baseActions, ...manageActions] : baseActions;

  // Render expanded content for each student (details only)
  const renderExpandedStudentContent = (student: Student) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
      <div className="space-y-2">
        <h4 className="font-semibold text-sm">معلومات الاتصال</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">الهاتف المحمول:</span>
            <span>{student.mobile_phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">هاتف ولي الأمر:</span>
            <span>{student.parent_phone || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">المدينة:</span>
            <span>{student.city || '-'}</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <h4 className="font-semibold text-sm">معلومات التسجيل</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">الرقم التسلسلي:</span>
            <Badge variant="secondary">{student.serial_number}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">تاريخ التسجيل:</span>
            <span>{formatShortArabicDate(student.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <UnifiedLayout>
        <div className="p-4">
          <LoadingSpinner />
        </div>
      </UnifiedLayout>
    );
  }

  if (error) {
    return (
      <UnifiedLayout>
        <div className="p-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-destructive">خطأ في تحميل بيانات الطلاب</p>
            </CardContent>
          </Card>
        </div>
      </UnifiedLayout>
    );
  }

  return (
    <UnifiedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <Users className="w-8 h-8" />
              إدارة الطلاب
            </h1>
            <p className="text-muted-foreground mt-2">
              إدارة بيانات الطلاب وعرض المعلومات التفصيلية
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddStudent(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة طالب
            </Button>
            <BulkUploadModal />
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>البحث عن طالب</CardTitle>
            <CardDescription>
              يمكن البحث باستخدام رقم الهاتف أو الرقم التسلسلي للطالب
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="رقم الهاتف أو الرقم التسلسلي..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 min-w-[220px]"
                />
                <Button
                  onClick={() => setShowScanner((v) => !v)}
                  variant="outline"
                  className="flex items-center gap-2 shrink-0"
                >
                  <Scan className="h-4 w-4" />
                  مسح
                </Button>
                <Button
                  onClick={handleSearch}
                  disabled={searchMutation.isPending}
                  className="flex items-center gap-2 shrink-0"
                >
                  <Search className="h-4 w-4" />
                  بحث
                </Button>
                {searchTerm && (
                  <Button
                    onClick={resetSearch}
                    variant="outline"
                    className="shrink-0"
                  >
                    إلغاء البحث
                  </Button>
                )}
              </div>
              {showScanner && (
                <div className="rounded-md border p-2 bg-muted/30">
                  <Scanner
                    onScan={(d: string | null) => {
                      const v = (d || '').trim();
                      if (!v) return;
                      setSearchTerm(v);
                      setShowScanner(false);
                      setTimeout(() => handleSearch(), 0);
                    }}
                    decoderOptions={{ formats: ['qr_code','code_128','code_39','ean_13','ean_8','upc_a','upc_e'] }}
                    aspectRatio="4/3"
                    className="w-full rounded-md overflow-hidden"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    يمكن استخدام ماسح الكاميرا أو قارئ الباركود المتصل كلوحة مفاتيح.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <MobileResponsiveTable
          data={students}
          columns={studentColumns}
          actions={studentActions}
          title={`قائمة الطلاب (${total})`}
          isLoading={isLoading || isFetching}
          emptyMessage="لا توجد طلاب مسجلين"
          emptyIcon={<Users className="h-12 w-12 text-muted-foreground mx-auto" />}
          emptyAction={canManageStudents ? { label: 'إضافة طالب جديد', onClick: () => setShowAddStudent(true), icon: <Plus className="h-4 w-4 mr-2" /> } : undefined}
          getRowKey={(student) => student.id}
          expandedContent={renderExpandedStudentContent}
          itemsPerPage={PAGE_SIZE}
          serverSide
          totalItems={total}
          currentPage={page}
          onPageChange={setPage}
        />

        {/* Modals */}
        <AddStudentModal 
          isOpen={showAddStudent}
          onClose={() => setShowAddStudent(false)}
        />
        
        <BulkUploadModal 
          isOpen={showBulkUpload}
          onClose={() => setShowBulkUpload(false)}
        />

        {qrStudent && (
          <StudentQRCodeModal
            student={qrStudent}
            isOpen={true}
            onClose={() => setQrStudent(null)}
          />
        )}

        {editingStudent && (
          <EditStudentModal 
            student={editingStudent}
            isOpen={true}
            onClose={() => setEditingStudent(null)}
          />
        )}

        {/* Delete confirmation */}
        <AlertDialog open={!!confirmDeleteStudent} onOpenChange={(open) => { if (!open) setConfirmDeleteStudent(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف الطالب "{confirmDeleteStudent?.name}"؟ هذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع تسجيلاته وحضوره ومدفوعاته.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmDeleteStudent) {
                    deleteMutation.mutate(confirmDeleteStudent.id);
                  }
                  setConfirmDeleteStudent(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </UnifiedLayout>
  );
};

export default StudentsPage;