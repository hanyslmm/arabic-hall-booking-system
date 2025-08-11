import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Mail, Phone, Shield, UserPlus } from "lucide-react";

const userSchema = z.object({
  username: z.string().min(1, "يرجى إدخال اسم المستخدم"),
  password: z.string().min(3, "كلمة المرور يجب أن تكون 3 أحرف على الأقل"),
  full_name: z.string().optional(),
  email: z.string().email("يرجى إدخال بريد إلكتروني صحيح").optional().or(z.literal("")),
  phone: z.string().optional(),
  user_role: z.enum(["owner", "manager", "space_manager", "teacher"], {
    errorMap: () => ({ message: "يرجى اختيار الدور" })
  }),
  teacher_id: z.string().optional()
}).refine((data) => data.user_role !== 'teacher' || !!data.teacher_id, {
  message: 'يرجى اختيار المعلم لهذا الحساب',
  path: ['teacher_id']
});

type UserFormData = z.infer<typeof userSchema>;

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddUserModal = ({ isOpen, onClose }: AddUserModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
defaultValues: { 
      username: "", 
      password: "", 
      full_name: "",
      email: "",
      phone: "",
      user_role: undefined,
      teacher_id: ""
    },
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['modal-teachers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, name, teacher_code')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

const addUserMutation = useMutation({
  mutationFn: async (data: UserFormData) => {
    // Call the Edge Function to create user
    const response = await supabase.functions.invoke('create-user', {
body: {
  username: data.username,
  password: data.password,
  full_name: data.full_name || undefined,
  email: data.email || undefined,
  phone: data.phone || undefined,
  user_role: data.user_role,
  teacher_id: data.user_role === 'teacher' ? data.teacher_id : undefined,
},
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to create user');
    }

    return response.data;
  },
    onSuccess: () => {
      toast({
        title: "تم إضافة المستخدم بنجاح",
        description: "تمت إضافة المستخدم للنظام بنجاح.",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إضافة المستخدم",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    addUserMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl">إضافة مستخدم جديد</DialogTitle>
              <DialogDescription className="text-base">
                إضافة مستخدم جديد للنظام مع تحديد الصلاحيات المناسبة
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Required Fields Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <div className="w-2 h-2 bg-destructive rounded-full"></div>
              الحقول المطلوبة
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  اسم المستخدم *
                </Label>
                <Input 
                  id="username" 
                  placeholder="أدخل اسم المستخدم" 
                  {...form.register("username")} 
                  className="h-11"
                />
                {form.formState.errors.username && (
                  <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  كلمة المرور *
                </Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="أدخل كلمة المرور" 
                  {...form.register("password")} 
                  className="h-11"
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="user_role" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                الدور *
              </Label>
              <Select onValueChange={value => form.setValue("user_role", value as any)} value={form.watch("user_role") || ""}>
                <SelectTrigger id="user_role" className="h-11">
                  <SelectValue placeholder="اختر الدور" />
                </SelectTrigger>
<SelectContent>
  <SelectItem value="space_manager">مدير قاعات</SelectItem>
  <SelectItem value="manager">مدير</SelectItem>
  <SelectItem value="owner">مالك</SelectItem>
  <SelectItem value="teacher">معلم</SelectItem>
  <SelectItem value="read_only">قراءة فقط</SelectItem>
</SelectContent>
              </Select>
              {form.formState.errors.user_role && (
                <p className="text-sm text-destructive">{form.formState.errors.user_role.message}</p>
              )}
</div>

{form.watch("user_role") === 'teacher' && (
  <div className="space-y-2">
    <Label htmlFor="teacher_id" className="flex items-center gap-2">
      <User className="w-4 h-4" />
      اختر المعلم (بالاسم/الكود)
    </Label>
    <Select value={form.watch('teacher_id') || ''} onValueChange={val => form.setValue('teacher_id', val)}>
      <SelectTrigger id="teacher_id" className="h-11">
        <SelectValue placeholder="اختر المعلم" />
      </SelectTrigger>
      <SelectContent>
        {teachers.map((t: any) => (
          <SelectItem key={t.id} value={t.id}>{t.name} {t.teacher_code ? `(${t.teacher_code})` : ''}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    {form.formState.errors.teacher_id && (
      <p className="text-sm text-destructive">{form.formState.errors.teacher_id.message as string}</p>
    )}
  </div>
)}

</div>

          <Separator />

          {/* Optional Fields Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
              الحقول الاختيارية
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  الاسم الكامل
                </Label>
                <Input 
                  id="full_name" 
                  placeholder="أدخل الاسم الكامل (اختياري)" 
                  {...form.register("full_name")} 
                  className="h-11"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    البريد الإلكتروني
                  </Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="example@domain.com" 
                    {...form.register("email")} 
                    className="h-11"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    رقم الهاتف
                  </Label>
                  <Input 
                    id="phone" 
                    placeholder="01xxxxxxxxx" 
                    {...form.register("phone")} 
                    className="h-11"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              type="submit" 
              className="flex-1 h-11" 
              disabled={addUserMutation.isPending}
            >
              {addUserMutation.isPending ? "جاري الإضافة..." : "إضافة المستخدم"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="flex-1 h-11"
            >
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
