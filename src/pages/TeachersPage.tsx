import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, GraduationCap, Download, Upload } from "lucide-react";
import { AddTeacherModal } from "@/components/teacher/AddTeacherModal";
import { EditTeacherModal } from "@/components/teacher/EditTeacherModal";
import { TeacherCodeManager } from "@/components/teacher/TeacherCodeManager";
import { BulkUploadModal } from "@/components/teacher/BulkUploadModal";
import { formatShortArabicDate } from "@/utils/dateUtils";
import { Badge } from "@/components/ui/badge";
import { getTeachers, deleteTeacher } from "@/api/teachers";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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
}

const TeachersPage = () => {
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showEditTeacher, setShowEditTeacher] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
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
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const canManage = profile?.user_role === 'owner' || profile?.user_role === 'manager' || profile?.user_role === 'space_manager' || isAdmin;

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
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar 
        userRole={profile?.user_role} 
        userName={profile?.full_name || profile?.email || undefined}
        isAdmin={isAdmin}
      />
      
      <main className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">إدارة المعلمين</h1>
            <p className="text-muted-foreground mt-2">
              عرض وإدارة المعلمين في النظام
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              <span className="font-semibold">{teachers?.length || 0} معلم</span>
            </div>
            {canManage && (
              <div className="flex gap-2 flex-wrap">
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

        <Card>
          <CardHeader>
            <CardTitle>قائمة المعلمين</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p>جاري تحميل المعلمين...</p>
              </div>
            ) : teachers?.length === 0 ? (
              <div className="text-center py-8">
                <GraduationCap className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">لا يوجد معلمين</h3>
                <p className="text-muted-foreground mb-4">
                  لم يتم إضافة أي معلمين بعد
                </p>
                {canManage && (
                  <Button onClick={() => setShowAddTeacher(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    إضافة أول معلم
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">اسم المعلم</TableHead>
                      <TableHead className="text-right">تاريخ الإضافة</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">رقم التلفون</TableHead>
                      <TableHead className="text-right">المادة الدراسية</TableHead>
                      <TableHead className="text-right">المراحل الدراسية</TableHead>
                      {canManage && <TableHead className="text-right">الإجراءات</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers?.map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium">
                          {teacher.name}
                        </TableCell>
                        <TableCell>
                          {formatShortArabicDate(teacher.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-green-600">
                            نشط
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {teacher.mobile_phone || "غير محدد"}
                        </TableCell>
                        <TableCell>
                          {teacher.subjects?.name || "غير محدد"}
                        </TableCell>
                        <TableCell>
                          {teacher.teacher_academic_stages && teacher.teacher_academic_stages.length > 0
                            ? teacher.teacher_academic_stages
                                .map(stage => stage.academic_stages.name)
                                .join(", ")
                            : "غير محدد"}
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTeacher(teacher);
                                  setShowEditTeacher(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteTeacherMutation.mutate(teacher.id)}
                                disabled={deleteTeacherMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

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
      </main>
    </div>
  );
};

export default TeachersPage;
