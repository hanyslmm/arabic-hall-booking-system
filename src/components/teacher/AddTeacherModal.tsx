import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const teacherSchema = z.object({
  name: z.string().min(1, "يرجى إدخال اسم المعلم"),
  mobile_phone: z.string().optional(),
  subject_id: z.string().optional(),
  academic_stage_ids: z.array(z.string()).optional(),
});

type TeacherFormData = z.infer<typeof teacherSchema>;

interface AddTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Subject {
  id: string;
  name: string;
}

interface AcademicStage {
  id: string;
  name: string;
}

export const AddTeacherModal = ({ isOpen, onClose }: AddTeacherModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  const form = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      name: "",
      mobile_phone: "",
      subject_id: "",
      academic_stage_ids: [],
    },
  });

  // Fetch subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async (): Promise<Subject[]> => {
      const { getSubjects } = await import('@/api/subjects');
      return await getSubjects();
    },
  });

  // Fetch academic stages
  const { data: academicStages = [] } = useQuery({
    queryKey: ['academic-stages'],
    queryFn: async (): Promise<AcademicStage[]> => {
      try {
        const { data, error } = await supabase.from('academic_stages').select('id, name').order('name');
        if (error) throw error;
        return data;
      } catch (error) {
        console.warn("Academic stages table not found:", error);
        return [];
      }
    },
  });

  const createTeacherMutation = useMutation({
    mutationFn: async (data: TeacherFormData) => {
      const { addTeacher, addTeacherAcademicStages } = await import('@/api/teachers');
      
      // Prepare teacher data with proper handling of empty strings
      const teacherData: any = {
        name: data.name,
      };
      
      // Only include mobile_phone if it has a value
      if (data.mobile_phone && data.mobile_phone.trim() !== '') {
        teacherData.mobile_phone = data.mobile_phone.trim();
      }
      
      // Only include subject_id if it has a value
      if (data.subject_id && data.subject_id !== '') {
        teacherData.subject_id = data.subject_id;
      }
      
      // Real-time validation guard: don't submit if phone duplicate still set
      if (form.formState.errors.mobile_phone) {
        throw new Error('duplicate_phone');
      }

      const teacher = await addTeacher(teacherData);

      // If academic stages are selected and teacher was created successfully, save them
      if (data.academic_stage_ids && data.academic_stage_ids.length > 0 && teacher) {
        await addTeacherAcademicStages(teacher.id, data.academic_stage_ids);
      }

      return teacher;
    },
    onSuccess: () => {
      toast({
        title: "تم بنجاح",
        description: "تم إضافة المعلم بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      form.reset();
      setSelectedStages([]);
      onClose();
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة المعلم",
        variant: "destructive",
      });
      console.error('Error adding teacher:', error);
    },
  });

  const addSubjectMutation = useMutation({
    mutationFn: async (name: string) => {
      const { addSubject } = await import('@/api/subjects');
      return await addSubject({ name });
    },
    onSuccess: () => {
      toast({
        title: "تم بنجاح",
        description: "تم إضافة المادة بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setShowAddSubject(false);
      setNewSubjectName("");
    },
    onError: (error) => {
      toast({
        title: "تنبيه",
        description: "لا يمكن إضافة المواد في الوقت الحالي",
        variant: "destructive",
      });
      console.warn('Cannot add subject:', error);
    },
  });

  const handleAddSubject = () => {
    if (newSubjectName.trim()) {
      addSubjectMutation.mutate(newSubjectName.trim());
    }
  };

  const toggleAcademicStage = (stageId: string) => {
    const updatedStages = selectedStages.includes(stageId)
      ? selectedStages.filter(id => id !== stageId)
      : [...selectedStages, stageId];
    
    setSelectedStages(updatedStages);
    form.setValue('academic_stage_ids', updatedStages);
  };

  const checkTeacherPhoneDuplicate = async (phone: string) => {
    if (!phone.trim()) return false;
    const { count, error } = await supabase
      .from('teachers')
      .select('*', { count: 'exact', head: true })
      .eq('mobile_phone', phone.trim());
    if (error) return false;
    return (count || 0) > 0;
  };

  const onBlurPhone = async () => {
    const phone = form.getValues('mobile_phone') || '';
    if (!phone) return;
    setIsCheckingPhone(true);
    const exists = await checkTeacherPhoneDuplicate(phone);
    setIsCheckingPhone(false);
    if (exists) {
      form.setError('mobile_phone', { message: 'رقم الهاتف مستخدم من قبل معلم آخر' });
    } else {
      form.clearErrors('mobile_phone');
    }
  };

  const onSubmit = (data: TeacherFormData) => {
    createTeacherMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة معلم جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">اسم المعلم</Label>
            <Input
              id="name"
              placeholder="أدخل اسم المعلم"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile_phone">رقم الهاتف المحمول</Label>
            <Input
              id="mobile_phone"
              placeholder="أدخل رقم الهاتف المحمول"
              {...form.register('mobile_phone')}
              onBlur={onBlurPhone}
              aria-invalid={!!form.formState.errors.mobile_phone}
            />
            {isCheckingPhone && (
              <p className="text-xs text-muted-foreground">جاري التحقق من الرقم...</p>
            )}
            {form.formState.errors.mobile_phone && (
              <p className="text-sm text-red-500">{form.formState.errors.mobile_phone.message as string}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject_id">المادة الدراسية (اختياري)</Label>
            <div className="flex gap-2">
              <Select
                onValueChange={(value) => form.setValue('subject_id', value)}
                defaultValue={form.getValues('subject_id')}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="اختر مادة دراسية" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowAddSubject(true)}
                aria-label="إضافة مادة"
                title="إضافة مادة"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Academic Stages Field */}
          {academicStages.length > 0 && (
            <div className="space-y-2">
              <Label>المراحل الدراسية (اختياري)</Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                {academicStages.map((stage) => (
                  <div key={stage.id} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id={`stage-${stage.id}`}
                      checked={selectedStages.includes(stage.id)}
                      onCheckedChange={() => toggleAcademicStage(stage.id)}
                    />
                    <Label htmlFor={`stage-${stage.id}`} className="text-sm">
                      {stage.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={createTeacherMutation.isPending}
            >
              {createTeacherMutation.isPending ? "جاري الإضافة..." : "إضافة المعلم"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
          </div>
        </form>

        {/* Add Subject Modal */}
        {showAddSubject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">إضافة مادة جديدة</h3>
              <Input
                placeholder="اسم المادة"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubject();
                  }
                }}
              />
              <div className="flex gap-2 mt-4">
                <Button onClick={handleAddSubject} disabled={addSubjectMutation.isPending}>
                  {addSubjectMutation.isPending ? "جاري الإضافة..." : "إضافة"}
                </Button>
                <Button variant="outline" onClick={() => setShowAddSubject(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
