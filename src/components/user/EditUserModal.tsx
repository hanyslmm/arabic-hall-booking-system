
import React from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { UserProfile } from "@/api/users";
import { User, Lock, Mail, Phone, Shield, Edit, Key } from "lucide-react";

const editUserSchema = z.object({
  full_name: z.string().optional(),
  email: z.string().email("يرجى إدخال بريد إلكتروني صحيح").optional().or(z.literal("")),
  phone: z.string().optional(),
  password: z.string().min(3, "كلمة المرور يجب أن تكون 3 أحرف على الأقل").optional().or(z.literal("")),
  user_role: z.enum(["owner", "manager", "space_manager", "teacher", "read_only"], {
    errorMap: () => ({ message: "يرجى اختيار الدور" })
  }),
  teacher_id: z.string().optional()
}).refine((data) => data.user_role !== 'teacher' || !!data.teacher_id, {
  message: 'يرجى اختيار المعلم لهذا الحساب',
  path: ['teacher_id']
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

export const EditUserModal = ({ isOpen, onClose, user }: EditUserModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
defaultValues: { 
  full_name: user?.full_name || "",
  email: user?.email || "",
  phone: user?.phone || "",
  password: "", 
  user_role: user?.user_role || "space_manager",
  teacher_id: (user as any)?.teacher_id || ""
},
  });

  // Update form when user changes
  React.useEffect(() => {
    if (user) {
      form.reset({
        full_name: user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
password: "",
user_role: user.user_role || "space_manager",
teacher_id: (user as any).teacher_id || ""
      });
    }
}, [user, form]);

// Load teachers for selection
const { data: teachers = [] } = useQuery({
  queryKey: ['edit-modal-teachers'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('teachers')
      .select('id, name, teacher_code')
      .order('name');
    if (error) throw error;
    return data;
  }
});

  const updateUserMutation = useMutation({
    mutationFn: async (data: EditUserFormData) => {
      if (!user) throw new Error('No user selected');

const updateData: any = {
  userId: user.id,
  user_role: data.user_role,
  full_name: data.full_name || undefined,
  email: data.email || undefined,
  phone: data.phone || undefined,
  teacher_id: data.user_role === 'teacher' ? data.teacher_id : null,
};

      if (data.password && data.password.trim() !== "") {
        updateData.password = data.password;
      }

      // Call the Edge Function to update user
      const response = await supabase.functions.invoke('update-user', {
        body: updateData,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to update user');
      }

      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "تم تحديث المستخدم بنجاح",
        description: "تم تحديث بيانات المستخدم بنجاح.",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في تحديث المستخدم",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditUserFormData) => {
    updateUserMutation.mutate(data);
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'owner': 'مالك',
      'manager': 'مدير',
      'space_manager': 'مدير قاعات'
    };
    return roleMap[role] || role;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Edit className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl">تعديل المستخدم</DialogTitle>
              <DialogDescription className="text-base">
                تحديث بيانات المستخدم والصلاحيات
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        {user && (
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {user.full_name
                    ? user.full_name.charAt(0).toUpperCase()
                    : user.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-lg">{user.full_name || user.email}</p>
                <p className="text-sm text-muted-foreground">
                  الدور الحالي: {getRoleDisplayName(user.user_role || 'space_manager')}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* User Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="w-4 h-4" />
              معلومات المستخدم
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  الاسم الكامل
                </Label>
                <Input 
                  id="full_name" 
                  placeholder="أدخل الاسم الكامل" 
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

          {/* Security Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Shield className="w-4 h-4" />
              الأمان والصلاحيات
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user_role" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  الدور
                </Label>
                <Select 
                  onValueChange={value => form.setValue("user_role", value as any)} 
                  value={form.watch("user_role") || "space_manager"}
                >
                  <SelectTrigger id="user_role" className="h-11">
                    <SelectValue placeholder="اختر الدور" />
                  </SelectTrigger>
<SelectContent>
  <SelectItem value="space_manager">مدير قاعات</SelectItem>
  <SelectItem value="manager">مدير</SelectItem>
  <SelectItem value="owner">مالك</SelectItem>
  <SelectItem value="teacher">معلم</SelectItem>
</SelectContent>
                </Select>
                {form.formState.errors.user_role && (
                  <p className="text-sm text-destructive">{form.formState.errors.user_role.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  كلمة المرور الجديدة
                </Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="اتركها فارغة لعدم التغيير" 
                  {...form.register("password")} 
                  className="h-11"
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  اتركها فارغة إذا كنت لا تريد تغيير كلمة المرور
                </p>
              </div>
            </div>
</div>

{/* Teacher mapping */}
{form.watch('user_role') === 'teacher' && (
  <div className="space-y-2">
    <Label htmlFor="teacher_id" className="flex items-center gap-2">
      <User className="w-4 h-4" />
      اختر المعلم (بالاسم/الكود)
    </Label>
    <Select value={form.watch('teacher_id') || ''} onValueChange={(val) => form.setValue('teacher_id', val)}>
      <SelectTrigger id="teacher_id" className="h-11">
        <SelectValue placeholder="اختر المعلم" />
      </SelectTrigger>
      <SelectContent>
        {(teachers as any[]).map((t: any) => (
          <SelectItem key={t.id} value={t.id}>{t.name} {t.teacher_code ? `(${t.teacher_code})` : ''}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              type="submit" 
              className="flex-1 h-11" 
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? "جاري التحديث..." : "تحديث المستخدم"}
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
