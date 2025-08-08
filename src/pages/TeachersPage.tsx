import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, GraduationCap, Upload, Phone, BookOpen, Calendar } from "lucide-react";
import { AddTeacherModal } from "@/components/teacher/AddTeacherModal";
import { EditTeacherModal } from "@/components/teacher/EditTeacherModal";
import { TeacherCodeManager } from "@/components/teacher/TeacherCodeManager";
import { BulkUploadModal } from "@/components/teacher/BulkUploadModal";
import { formatShortArabicDate } from "@/utils/dateUtils";
import { Badge } from "@/components/ui/badge";
import { getTeachers, deleteTeacher, updateTeacher, applyTeacherDefaultFee } from "@/api/teachers";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { MobileResponsiveTable, TableColumn, TableAction } from "@/components/common/MobileResponsiveTable";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Teacher {
  id: string;
  name: string;
  mobile_phone?: string | null;
  subject_id?: string | null;
  created_at: string;
  // Relations
  subjects?: { name: string } | null;
  teacher_academic_stages?: Array<{
    academic_stages: { name: string };
  }>;
  default_class_fee?: number | null;
}

const TeachersPage = () => {
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showEditTeacher, setShowEditTeacher] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [confirmDeleteTeacher, setConfirmDeleteTeacher] = useState<Teacher | null>(null);
  const [feeModalTeacher, setFeeModalTeacher] = useState<Teacher | null>(null);
  const [newDefaultFee, setNewDefaultFee] = useState<number>(0);
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: teachers, isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: getTeachers
  });

  const deleteTeacherMutation = useMutation({
    mutationFn: async (teacherId: string) => {
      await deleteTeacher(teacherId);
    },
    onSuccess: () => {
      toast({
        title: "تم حذف المعلم بنجاح",
        description: "تم حذف المعلم من النظام",
      });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error) => {
      toast({
        title: "خطأ في حذف المعلم",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const canManage = profile?.user_role === 'owner' || profile?.user_role === 'manager' || profile?.user_role === 'space_manager' || isAdmin;

  // Define table columns with mobile optimization
  const teacherColumns: TableColumn<Teacher>[] = [
    {
      key: 'name',
      header: 'اسم المعلم',
      mobileLabel: 'الاسم',
      render: (teacher) => (
        <span className="font-medium">{teacher.name}</span>
      ),
    },
    {
      key: 'mobile_phone',
      header: 'رقم التلفون',
      mobileLabel: 'التلفون',
      render: (teacher) => (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground sm:inline hidden" />
          {teacher.mobile_phone || "غير محدد"}
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'المادة الدراسية',
      mobileLabel: 'المادة',
      render: (teacher) => (
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground sm:inline hidden" />
          {teacher.subjects?.name || "غير محدد"}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'تاريخ الإضافة',
      mobileLabel: 'التاريخ',
      hideOnMobile: true,
      render: (teacher) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {formatShortArabicDate(teacher.created_at)}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      mobileLabel: 'الحالة',
      render: () => (
        <Badge variant="outline" className="text-green-600">
          نشط
        </Badge>
      ),
    },
    {
      key: 'default_fee',
      header: 'الرسوم الافتراضية',
      mobileLabel: 'الرسوم',
      render: (teacher) => (
        <span>{teacher.default_class_fee ?? 0} جنيه</span>
      ),
    },
  ];

  // Table actions
  const teacherActions: TableAction<Teacher>[] = canManage ? [
    {
      label: 'تعديل',
      onClick: (teacher) => {
        setSelectedTeacher(teacher);
        setShowEditTeacher(true);
      },
      variant: 'outline',
      size: 'sm',
      icon: <Edit className="h-4 w-4" />,
    },
    {
      label: 'تعديل الرسوم',
      onClick: (teacher) => {
        setFeeModalTeacher(teacher);
        setNewDefaultFee(teacher.default_class_fee ?? 0);
      },
      variant: 'outline',
      size: 'sm',
      icon: <Edit className="h-4 w-4" />,
    },
    {
      label: 'حذف',
      onClick: (teacher) => setConfirmDeleteTeacher(teacher),
      variant: 'destructive',
      size: 'sm',
      icon: <Trash2 className="h-4 w-4" />,
    },
  ] : [];

  // Render expanded content for each teacher (details only)
  const renderExpandedTeacherContent = (teacher: Teacher) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
      <div className="space-y-2">
        <h4 className="font-semibold text-sm">معلومات الاتصال</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">الاسم:</span>
            <span>{teacher.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">رقم التلفون:</span>
            <span>{teacher.mobile_phone || "غير محدد"}</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <h4 className="font-semibold text-sm">المعلومات الأكاديمية</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">المادة الدراسية:</span>
            <span>{teacher.subjects?.name || "غير محدد"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">المراحل الدراسية:</span>
            <span className="text-right">
              {teacher.teacher_academic_stages && teacher.teacher_academic_stages.length > 0
                ? teacher.teacher_academic_stages
                    .map(stage => stage.academic_stages.name)
                    .join(", ")
                : "غير محدد"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">تاريخ الإضافة:</span>
            <span>{formatShortArabicDate(teacher.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Export to CSV
  const exportToCSV = () => {
    if (!teachers || teachers.length === 0) return;

    const headers = [
      'الاسم',
      'رقم التلفون',
      'المادة الدراسية',
      'المراحل الدراسية',
      'تاريخ الإضافة'
    ];

    const csvContent = [
      headers.join(','),
      ...teachers.map(teacher => [
        teacher.name,
        teacher.mobile_phone || '',
        teacher.subjects?.name || '',
        teacher.teacher_academic_stages
          ? teacher.teacher_academic_stages.map(stage => stage.academic_stages.name).join('; ')
          : '',
        format(new Date(teacher.created_at), 'yyyy-MM-dd')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `teachers-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import from CSV
  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',');
        
        // Skip header row
        const teachersData = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',');
            return {
              name: values[0]?.trim(),
              mobile_phone: values[1]?.trim() || null,
              // For now, we'll just import basic data without subjects/stages
              // as that would require more complex mapping
            };
          })
          .filter(teacher => teacher.name);

        if (teachersData.length === 0) {
          toast({
            title: "خطأ",
            description: "لم يتم العثور على بيانات صالحة في الملف",
            variant: "destructive",
          });
          return;
        }

        // Get current user for created_by field
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
          toast({
            title: "خطأ",
            description: "غير مصرح",
            variant: "destructive",
          });
          return;
        }

        const teachersWithCreatedBy = teachersData.map(teacher => ({
          ...teacher,
          created_by: user.user.id
        }));

        const { error } = await supabase
          .from('teachers')
          .insert(teachersWithCreatedBy);

        if (error) throw error;

        toast({
          title: "تم الاستيراد بنجاح",
          description: `تم استيراد ${teachersData.length} معلم`,
        });

        queryClient.invalidateQueries({ queryKey: ['teachers'] });
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: "خطأ في الاستيراد",
          description: "فشل في استيراد البيانات",
          variant: "destructive",
        });
      }
    };
    
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        userRole={profile?.user_role} 
        userName={profile?.full_name || profile?.email || undefined}
        isAdmin={isAdmin}
      />
      
      <main className="container mx-auto p-4 pt-20 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">إدارة المعلمين</h1>
            <p className="text-muted-foreground mt-2">
              عرض وإدارة المعلمين في النظام
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              <span className="font-semibold">{teachers?.length || 0} معلم</span>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <BulkUploadModal>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    رفع ملف Excel
                  </Button>
                </BulkUploadModal>
                <Button onClick={() => setShowAddTeacher(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة معلم
                </Button>
              </div>
            )}
          </div>
        </div>

        <MobileResponsiveTable
          data={teachers || []}
          columns={teacherColumns}
          actions={teacherActions}
          title="قائمة المعلمين"
          isLoading={isLoading}
          emptyMessage="لم يتم إضافة أي معلمين بعد"
          emptyIcon={<GraduationCap className="h-16 w-16 mx-auto text-muted-foreground" />}
          getRowKey={(teacher) => teacher.id}
          expandedContent={renderExpandedTeacherContent}
          itemsPerPage={50}
        />

        {/* Teacher Code Management */}
        {canManage && <TeacherCodeManager />}

        {canManage && (
          <>
            <AddTeacherModal 
              isOpen={showAddTeacher}
              onClose={() => setShowAddTeacher(false)}
            />
            <EditTeacherModal
              isOpen={showEditTeacher}
              onClose={() => setShowEditTeacher(false)}
              teacher={selectedTeacher}
            />
          </>
        )}

        {/* Default fee modal */}
        <Dialog open={!!feeModalTeacher} onOpenChange={(open) => { if(!open) setFeeModalTeacher(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل الرسوم الافتراضية للمعلم</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>الرسوم الافتراضية (تطبق على كل مجموعات المعلم غير المخصصة)</Label>
                <Input type="number" value={newDefaultFee} min={0} onChange={(e)=> setNewDefaultFee(Number(e.target.value)||0)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={()=> setFeeModalTeacher(null)}>إلغاء</Button>
                <Button
                  onClick={async ()=>{
                    if(!feeModalTeacher) return;
                    try{
                      await applyTeacherDefaultFee(feeModalTeacher.id, newDefaultFee);
                      setFeeModalTeacher(null);
                      setNewDefaultFee(0);
                      toast({ title: 'تم تطبيق الرسوم الافتراضية وتحديث المجموعات والطلاب' });
                      queryClient.invalidateQueries({ queryKey: ['teachers'] });
                      queryClient.invalidateQueries({ queryKey: ['bookings'] });
                      queryClient.invalidateQueries({ queryKey: ['registrations'] });
                    }catch(err:any){
                      toast({ title: 'فشل تحديث الرسوم', description: err.message, variant: 'destructive' });
                    }
                  }}
                >حفظ</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!confirmDeleteTeacher} onOpenChange={(open) => { if (!open) setConfirmDeleteTeacher(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف المعلم "{confirmDeleteTeacher?.name}"؟ هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmDeleteTeacher) {
                    deleteTeacherMutation.mutate(confirmDeleteTeacher.id);
                  }
                  setConfirmDeleteTeacher(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default TeachersPage;
