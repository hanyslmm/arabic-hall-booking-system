import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Hall {
  id?: string;
  name: string;
  capacity: number;
  operating_start_time?: string;
  operating_end_time?: string;
}

interface AddHallModalProps {
  hall?: Hall;
  isEdit?: boolean;
  onSuccess?: () => void;
}

export const AddHallModal = ({ hall, isEdit = false, onSuccess }: AddHallModalProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Hall, 'id'>>({
    name: hall?.name || '',
    capacity: hall?.capacity || 30,
    operating_start_time: hall?.operating_start_time || '',
    operating_end_time: hall?.operating_end_time || ''
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Hall, 'id'>) => {
      const { error } = await supabase
        .from('halls')
        .insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['halls'] });
      toast.success('تم إضافة القاعة بنجاح');
      setOpen(false);
      setFormData({ name: '', capacity: 30, operating_start_time: '', operating_end_time: '' });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('حدث خطأ أثناء إضافة القاعة');
      console.error('Error creating hall:', error);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Omit<Hall, 'id'>) => {
      if (!hall?.id) throw new Error('No hall ID provided');
      const { error } = await supabase
        .from('halls')
        .update(data)
        .eq('id', hall.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['halls'] });
      toast.success('تم تحديث القاعة بنجاح');
      setOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('حدث خطأ أثناء تحديث القاعة');
      console.error('Error updating hall:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم القاعة');
      return;
    }
    
    if (formData.capacity < 1) {
      toast.error('يجب أن تكون سعة القاعة أكبر من صفر');
      return;
    }

    if (isEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" variant={isEdit ? "outline" : "default"} size={isEdit ? "sm" : "default"}>
          {isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isEdit ? 'تعديل' : 'إضافة قاعة جديدة'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'تعديل القاعة' : 'إضافة قاعة جديدة'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 text-right">
          <div className="space-y-2">
            <Label htmlFor="name">اسم القاعة</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="أدخل اسم القاعة"
              disabled={isLoading}
              className="text-right"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="capacity">السعة (عدد الطلاب)</Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
              placeholder="أدخل سعة القاعة"
              disabled={isLoading}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="operating_start_time">وقت بداية التشغيل</Label>
            <Input
              id="operating_start_time"
              type="time"
              value={formData.operating_start_time}
              onChange={(e) => setFormData(prev => ({ ...prev, operating_start_time: e.target.value }))}
              disabled={isLoading}
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="operating_end_time">وقت نهاية التشغيل</Label>
            <Input
              id="operating_end_time"
              type="time"
              value={formData.operating_end_time}
              onChange={(e) => setFormData(prev => ({ ...prev, operating_end_time: e.target.value }))}
              disabled={isLoading}
              className="text-right"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? 'جاري الحفظ...' : (isEdit ? 'تحديث' : 'إضافة')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};