import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const teacherSchema = z.object({
  name: z.string().min(1, "يرجى إدخال اسم المعلم"),
  mobile_phone: z.string().optional(),
  subject_id: z.string().optional(),
  academic_stage_ids: z.array(z.string()).optional(),
  default_class_fee: z.coerce.number().optional(),
});

type TeacherFormData = z.infer<typeof teacherSchema>;

interface EditTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: { 
    id: string; 
    name: string; 
    mobile_phone?: string | null;
    subject_id?: string | null;
  } | null;
}

interface Subject {
  id: string;
  name: string;
}

interface AcademicStage {
  id: string;
  name: string;
}

export const EditTeacherModal = ({ isOpen, onClose, teacher }: EditTeacherModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStages, setSelectedStages] = useState<string[]>([]);

  const form = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      name: teacher?.name || "",
      mobile_phone: teacher?.mobile_phone || "",
      subject_id: teacher?.subject_id || "",
      academic_stage_ids: [],
      default_class_fee: undefined,
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

  const updateTeacherMutation = useMutation({
    mutationFn: async (data: TeacherFormData) => {
      if (!teacher?.id) throw new Error("No teacher ID");
      const { updateTeacher, updateTeacherAcademicStages } = await import('@/api/teachers');
      
      // Prepare update data with proper handling of empty strings
      const updateData: any = {
        name: data.name,
      };
      
      // Only include mobile_phone if it has a value
      if (data.mobile_phone && data.mobile_phone.trim() !== '') {
        updateData.mobile_phone = data.mobile_phone.trim();
      }
      
      // Only include subject_id if it has a value
      if (data.subject_id && data.subject_id !== '') {
        updateData.subject_id = data.subject_id;
      }

      if (typeof (data as any).default_class_fee === 'number') {
        updateData.default_class_fee = (data as any).default_class_fee;
      }
      
      const updatedTeacher = await updateTeacher(teacher.id, updateData);

      // Update academic stages if they are selected
      if (data.academic_stage_ids) {
        await updateTeacherAcademicStages(teacher.id, data.academic_stage_ids);
      }

      return updatedTeacher;
    },
    onSuccess: () => {
      toast({
        title: "تم بنجاح",
        description: "تم تحديث المعلم بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث المعلم",
        variant: "destructive",
      });
      console.error('Error updating teacher:', error);
    },
  });

  const toggleAcademicStage = (stageId: string) => {
    const updatedStages = selectedStages.includes(stageId)
      ? selectedStages.filter(id => id !== stageId)
      : [...selectedStages, stageId];
    
    setSelectedStages(updatedStages);
    form.setValue('academic_stage_ids', updatedStages);
  };

  const onSubmit = (data: TeacherFormData) => {
    updateTeacherMutation.mutate(data);
  };

  // Reset form when teacher changes
  useEffect(() => {
    if (teacher) {
      form.reset({
        name: teacher.name,
        mobile_phone: teacher.mobile_phone || "",
        subject_id: teacher.subject_id || "",
        academic_stage_ids: [],
        default_class_fee: (teacher as any).default_class_fee ?? undefined,
      });
      setSelectedStages([]);
    }
  }, [teacher, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تعديل المعلم</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name Field */}
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

          {/* Mobile Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="mobile_phone">رقم الجوال (اختياري)</Label>
            <Input
              id="mobile_phone"
              placeholder="أدخل رقم الجوال"
              {...form.register('mobile_phone')}
            />
          </div>

          {/* Subject Field */}
          <div className="space-y-2">
            <Label htmlFor="subject">المادة الدراسية (اختياري)</Label>
            <Select
              value={form.watch('subject_id') || ""}
              onValueChange={(value) => form.setValue('subject_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المادة الدراسية" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Default class fee */}
          <div className="space-y-2">
            <Label htmlFor="default_class_fee">الرسوم الافتراضية للمعلم (اختياري)</Label>
            <Input
              id="default_class_fee"
              type="number"
              placeholder="0"
              {...form.register('default_class_fee', { valueAsNumber: true })}
            />
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
              disabled={updateTeacherMutation.isPending}
            >
              {updateTeacherMutation.isPending ? "جاري التحديث..." : "حفظ التغييرات"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
