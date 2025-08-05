import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { AddStudentModal } from "@/components/student/AddStudentModal";
import { EditStudentModal } from "@/components/student/EditStudentModal";
import { BulkUploadModal } from "@/components/student/BulkUploadModal";
import { EnhancedBulkUploadModal } from "@/components/student/EnhancedBulkUploadModal";
import { studentsApi, Student } from "@/api/students";
import { Plus, Search, Upload, Edit, Trash2, Users, Phone, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import { formatShortArabicDate } from "@/utils/dateUtils";
import { PaginatedTable, TableColumn, TableAction } from "@/components/common/PaginatedTable";

const StudentsPage = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showEnhancedBulkUpload, setShowEnhancedBulkUpload] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: students = [], isLoading, error } = useQuery({
    queryKey: ["students"],
    queryFn: studentsApi.getAll,
  });

  const searchMutation = useMutation({
    mutationFn: studentsApi.search,
    onSuccess: (searchResults) => {
      queryClient.setQueryData(["students"], searchResults);
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
    if (searchTerm.trim()) {
      searchMutation.mutate(searchTerm.trim());
    } else {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const resetSearch = () => {
    setSearchTerm("");
    queryClient.invalidateQueries({ queryKey: ["students"] });
  };

  const canManageStudents = profile?.role === 'ADMIN' || 
    (profile?.user_role && ['owner', 'manager'].includes(profile.user_role));

  // Define table columns
  const studentColumns: TableColumn<Student>[] = [
    {
      key: 'serial_number',
      header: 'الرقم التسلسلي',
      render: (student) => (
        <Badge variant="secondary">{student.serial_number}</Badge>
      ),
    },
    {
      key: 'name',
      header: 'الاسم',
      render: (student) => (
        <span className="font-medium">{student.name}</span>
      ),
    },
    {
      key: 'mobile_phone',
      header: 'رقم الهاتف',
      render: (student) => (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          {student.mobile_phone}
        </div>
      ),
    },
    {
      key: 'city',
      header: 'المدينة',
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
      render: (student) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {formatShortArabicDate(student.created_at)}
        </div>
      ),
    },
  ];

  // Render expanded content for each student
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

      {canManageStudents && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">الإجراءات</h4>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingStudent(student)}
              className="justify-start"
            >
              <Edit className="h-4 w-4 mr-2" />
              تعديل
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  حذف
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                  <AlertDialogDescription>
                    هل أنت متأكد من حذف الطالب "{student.name}"؟ 
                    هذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع تسجيلاته وحضوره ومدفوعاته.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate(student.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    حذف
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar 
          userRole={profile?.user_role} 
          userName={profile?.full_name || profile?.email || undefined}
        />
        <div className="container mx-auto p-4">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar 
          userRole={profile?.user_role} 
          userName={profile?.full_name || profile?.email || undefined}
        />
        <div className="container mx-auto p-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-destructive">خطأ في تحميل بيانات الطلاب</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        userRole={profile?.user_role} 
        userName={profile?.full_name || profile?.email || undefined}
      />
      
      <main className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <Users className="h-8 w-8" />
              إدارة الطلاب
            </h1>
            <p className="text-muted-foreground mt-2">
              إدارة معلومات الطلاب والتسجيلات
            </p>
          </div>
          
          {canManageStudents && (
            <div className="flex gap-2">
              <Button
                onClick={() => setShowEnhancedBulkUpload(true)}
                variant="default"
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                رفع جداول المعلمين
              </Button>
              <Button
                onClick={() => setShowBulkUpload(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                رفع ملف Excel بسيط
              </Button>
              <Button
                onClick={() => setShowAddStudent(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                إضافة طالب جديد
              </Button>
            </div>
          )}
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
            <div className="flex gap-2">
              <Input
                placeholder="رقم الهاتف أو الرقم التسلسلي..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                onClick={handleSearch}
                disabled={searchMutation.isPending}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                بحث
              </Button>
              {searchTerm && (
                <Button
                  onClick={resetSearch}
                  variant="outline"
                >
                  إلغاء البحث
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <PaginatedTable
          data={students}
          columns={studentColumns}
          title={`قائمة الطلاب (${students.length})`}
          isLoading={false}
          emptyMessage="لا توجد طلاب مسجلين"
          emptyIcon={<Users className="h-12 w-12 text-muted-foreground mx-auto" />}
          getRowKey={(student) => student.id}
          expandedContent={renderExpandedStudentContent}
          itemsPerPage={50}
        />

        {/* Modals */}
        <AddStudentModal 
          isOpen={showAddStudent}
          onClose={() => setShowAddStudent(false)}
        />
        
        <BulkUploadModal 
          isOpen={showBulkUpload}
          onClose={() => setShowBulkUpload(false)}
          onUpload={(students) => bulkUploadMutation.mutate(students)}
          defaultClassFees={0}
        />

        <EnhancedBulkUploadModal 
          isOpen={showEnhancedBulkUpload}
          onClose={() => setShowEnhancedBulkUpload(false)}
        />
        
        {editingStudent && (
          <EditStudentModal 
            student={editingStudent}
            isOpen={true}
            onClose={() => setEditingStudent(null)}
          />
        )}
      </main>
    </div>
  );
};

export default StudentsPage;