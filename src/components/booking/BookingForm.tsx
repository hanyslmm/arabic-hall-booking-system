
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format, addHours, parse } from "date-fns";
import { ar } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatArabicDate } from "@/utils/dateUtils";

const bookingSchema = z.object({
  hall_id: z.string().min(1, "يرجى اختيار القاعة"),
  teacher_id: z.string().min(1, "يرجى اختيار المعلم"),
  academic_stage_id: z.string().min(1, "يرجى اختيار المرحلة الدراسية"),
  number_of_students: z.number().min(1, "يجب أن يكون عدد الطلاب أكبر من صفر"),
  start_time: z.string().min(1, "يرجى اختيار وقت البداية"),
  days_of_week: z.array(z.string()).min(1, "يرجى اختيار يوم واحد على الأقل"),
  class_code: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

const DAYS_OF_WEEK = [
  { value: 'sunday', label: 'الأحد' },
  { value: 'monday', label: 'الاثنين' },
  { value: 'tuesday', label: 'الثلاثاء' },
  { value: 'wednesday', label: 'الأربعاء' },
  { value: 'thursday', label: 'الخميس' },
  { value: 'friday', label: 'الجمعة' },
  { value: 'saturday', label: 'السبت' },
];

interface BookingFormProps {
  onSuccess?: () => void;
}

export const BookingForm = ({ onSuccess }: BookingFormProps) => {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch default booking duration from settings
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*');
      if (error) throw error;
      return data;
    }
  });

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      number_of_students: 1,
      days_of_week: [],
    },
  });


  // Format time for display in AM/PM format
  const formatTimeDisplay = (timeString: string) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return format(date, 'hh:mm a', { locale: ar });
    } catch {
      return timeString;
    }
  };

  // Fetch halls
  const { data: halls } = useQuery({
    queryKey: ['halls'],
    queryFn: async () => {
      const { data, error } = await supabase.from('halls').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch teachers
  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teachers').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch academic stages
  const { data: academicStages } = useQuery({
    queryKey: ['academic-stages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_stages').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('غير مصرح');

      const bookingData = {
        hall_id: data.hall_id,
        teacher_id: data.teacher_id,
        academic_stage_id: data.academic_stage_id,
        number_of_students: data.number_of_students,
        start_time: data.start_time,
        start_date: format(new Date(), 'yyyy-MM-dd'), // Use current date
        end_date: null, // Permanent reservation
        days_of_week: data.days_of_week,
        created_by: user.user.id,
        status: 'active' as const,
        class_code: data.class_code || null,
      };

      const { data: result, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({
        title: "تم إنشاء الحجز بنجاح",
        description: "تم حفظ الحجز في النظام",
      });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      form.reset();
      setSelectedDays([]);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "خطأ في إنشاء الحجز",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDayToggle = (day: string) => {
    const updatedDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day];
    
    setSelectedDays(updatedDays);
    form.setValue('days_of_week', updatedDays);
  };

  const onSubmit = (data: BookingFormData) => {
    createBookingMutation.mutate(data);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">حجز قاعة جديد</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Hall Selection */}
          <div className="space-y-2">
            <Label htmlFor="hall_id">القاعة</Label>
            <Select onValueChange={(value) => form.setValue('hall_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="اختر القاعة" />
              </SelectTrigger>
              <SelectContent>
                {halls?.map((hall) => (
                  <SelectItem key={hall.id} value={hall.id}>
                    {hall.name} (سعة {hall.capacity} طالب)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.hall_id && (
              <p className="text-sm text-destructive">{form.formState.errors.hall_id.message}</p>
            )}
          </div>

          {/* Teacher Selection */}
          <div className="space-y-2">
            <Label htmlFor="teacher_id">المعلم</Label>
            <Select onValueChange={(value) => form.setValue('teacher_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المعلم" />
              </SelectTrigger>
              <SelectContent>
                {teachers?.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.teacher_id && (
              <p className="text-sm text-destructive">{form.formState.errors.teacher_id.message}</p>
            )}
          </div>

          {/* Academic Stage Selection */}
          <div className="space-y-2">
            <Label htmlFor="academic_stage_id">المرحلة الدراسية</Label>
            <Select onValueChange={(value) => form.setValue('academic_stage_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المرحلة الدراسية" />
              </SelectTrigger>
              <SelectContent>
                {academicStages?.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.academic_stage_id && (
              <p className="text-sm text-destructive">{form.formState.errors.academic_stage_id.message}</p>
            )}
          </div>

          {/* Expected Number of Students */}
          <div className="space-y-2">
            <Label htmlFor="number_of_students">العدد المتوقع للطلاب</Label>
            <Input
              type="number"
              min="1"
              {...form.register('number_of_students', { valueAsNumber: true })}
            />
            {form.watch('hall_id') && halls && (
              <p className="text-sm text-muted-foreground">
                سعة القاعة: {halls.find(h => h.id === form.watch('hall_id'))?.capacity} طالب
              </p>
            )}
            {form.formState.errors.number_of_students && (
              <p className="text-sm text-destructive">{form.formState.errors.number_of_students.message}</p>
            )}
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="start_time">وقت البداية</Label>
            <Input
              type="time"
              {...form.register('start_time')}
            />
            {form.watch('start_time') && (
              <p className="text-sm text-muted-foreground">
                العرض: {formatTimeDisplay(form.watch('start_time'))}
              </p>
            )}
            {form.formState.errors.start_time && (
              <p className="text-sm text-destructive">{form.formState.errors.start_time.message}</p>
            )}
          </div>


          {/* Days of Week */}
          <div className="space-y-2">
            <Label>أيام الأسبوع</Label>
            <div className="grid grid-cols-2 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.value} className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id={day.value}
                    checked={selectedDays.includes(day.value)}
                    onCheckedChange={() => handleDayToggle(day.value)}
                  />
                  <Label htmlFor={day.value}>{day.label}</Label>
                </div>
              ))}
            </div>
            {form.formState.errors.days_of_week && (
              <p className="text-sm text-destructive">{form.formState.errors.days_of_week.message}</p>
            )}
          </div>

          {/* Class Code */}
          <div className="space-y-2">
            <Label htmlFor="class_code">كود المجموعة (اختياري)</Label>
            <Input
              placeholder="مثال: B_SAT_1_PM"
              {...form.register('class_code')}
            />
            <p className="text-xs text-muted-foreground">
              اتركه فارغاً لتوليد الكود تلقائياً بناءً على المعلم والوقت
            </p>
            {form.formState.errors.class_code && (
              <p className="text-sm text-destructive">{form.formState.errors.class_code.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={createBookingMutation.isPending}
          >
            {createBookingMutation.isPending ? "جاري الحفظ..." : "حفظ الحجز"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
