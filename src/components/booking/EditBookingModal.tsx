import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { bookingsApi } from "@/api/bookings";

const bookingSchema = z.object({
  hall_id: z.string().min(1, "يرجى اختيار القاعة"),
  teacher_id: z.string().min(1, "يرجى اختيار المعلم"),
  academic_stage_id: z.string().min(1, "يرجى اختيار المرحلة الدراسية"),
  number_of_students: z.number().min(1, "يجب أن يكون عدد الطلاب أكبر من صفر"),
  start_time: z.string().min(1, "يرجى اختيار وقت البداية"),
  days_of_week: z.array(z.string()).min(1, "يرجى اختيار يوم واحد على الأقل"),
  status: z.enum(['active', 'cancelled', 'completed']),
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

interface EditBookingModalProps {
  bookingId: string;
  booking: any;
}

export const EditBookingModal = ({ bookingId, booking }: EditBookingModalProps) => {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [customFee, setCustomFee] = useState<number>(booking.class_fees || 0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      hall_id: booking.hall_id,
      teacher_id: booking.teacher_id,
      academic_stage_id: booking.academic_stage_id,
      number_of_students: booking.number_of_students,
      start_time: booking.start_time,
      days_of_week: booking.days_of_week,
      status: booking.status,
      class_code: booking.class_code || '',
    },
  });

  useEffect(() => {
    if (booking) {
      setSelectedDays(booking.days_of_week || []);
      setCustomFee(booking.class_fees || 0);
      form.reset({
        hall_id: booking.hall_id,
        teacher_id: booking.teacher_id,
        academic_stage_id: booking.academic_stage_id,
        number_of_students: booking.number_of_students,
        start_time: booking.start_time,
        days_of_week: booking.days_of_week,
        status: booking.status,
        class_code: booking.class_code || '',
      });
    }
  }, [booking, form]);

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

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      const { error } = await supabase
        .from('bookings')
        .update({
          hall_id: data.hall_id,
          teacher_id: data.teacher_id,
          academic_stage_id: data.academic_stage_id,
          number_of_students: data.number_of_students,
          start_time: data.start_time,
          days_of_week: data.days_of_week,
          status: data.status,
          class_code: data.class_code || null,
        })
        .eq('id', bookingId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "تم تحديث الحجز بنجاح",
        description: "تم حفظ التغييرات في النظام",
      });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings-report'] });
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "خطأ في تحديث الحجز",
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
    updateBookingMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="w-4 h-4 mr-1" />
          تعديل
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تعديل الحجز</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Hall Selection */}
          <div className="space-y-2">
            <Label htmlFor="hall_id">القاعة</Label>
            <Select 
              value={form.watch('hall_id')} 
              onValueChange={(value) => form.setValue('hall_id', value)}
            >
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
            <Select 
              value={form.watch('teacher_id')} 
              onValueChange={(value) => form.setValue('teacher_id', value)}
            >
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
            <Select 
              value={form.watch('academic_stage_id')} 
              onValueChange={(value) => form.setValue('academic_stage_id', value)}
            >
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

          {/* Number of Students */}
          <div className="space-y-2">
            <Label htmlFor="number_of_students">عدد الطلاب</Label>
            <Input
              type="number"
              min="1"
              {...form.register('number_of_students', { valueAsNumber: true })}
            />
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
            {form.formState.errors.start_time && (
              <p className="text-sm text-destructive">{form.formState.errors.start_time.message}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">الحالة</Label>
            <Select 
              value={form.watch('status')} 
              onValueChange={(value) => form.setValue('status', value as 'active' | 'cancelled' | 'completed')}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.status && (
              <p className="text-sm text-destructive">{form.formState.errors.status.message}</p>
            )}
          </div>

          {/* Class Code */}
          <div className="space-y-2">
            <Label htmlFor="class_code">كود المجموعة</Label>
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

          {/* Custom fee quick action */}
          <div className="rounded border p-3 space-y-2">
            <Label>الرسوم</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="الرسوم"
                value={Number.isFinite(customFee) ? customFee : 0}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomFee(value === '' ? 0 : Number(value) || 0);
                }}
                min={0}
              />
              <Button type="button" variant="outline" size="sm" onClick={async ()=>{
                try{
                  await bookingsApi.setCustomFeeForBooking(bookingId, customFee || 0);
                  queryClient.invalidateQueries({ queryKey: ['bookings'] });
                  toast({ title: 'تم تحديد الرسوم كـمخصصة لهذه المجموعة' });
                }catch(err:any){
                  toast({ title: 'فشل الإجراء', description: err.message, variant: 'destructive' });
                }
              }}>تحديد كمخصص</Button>
              <Button type="button" variant="outline" size="sm" onClick={async ()=>{
                try{
                  // Set is_custom_fee=false so teacher default applies next time it changes
                  await bookingsApi.update(bookingId, { is_custom_fee: false });
                  queryClient.invalidateQueries({ queryKey: ['bookings'] });
                  toast({ title: 'تم إعادة الرسوم إلى الوضع الافتراضي للمعلم' });
                }catch(err:any){
                  toast({ title: 'فشل الإجراء', description: err.message, variant: 'destructive' });
                }
              }}>اعتماد الافتراضي</Button>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={updateBookingMutation.isPending}
              className="flex-1"
            >
              {updateBookingMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};