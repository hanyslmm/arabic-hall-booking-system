
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Building } from "lucide-react";
import { HallScheduleModal } from "@/components/hall/HallScheduleModal";
import { formatShortArabicDate } from "@/utils/dateUtils";
import { AddHallModal } from "@/components/hall/AddHallModal";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Hall {
  id: string;
  name: string;
  capacity: number;
  operating_start_time?: string | null;
  operating_end_time?: string | null;
  created_at: string;
}

const HallsPage = () => {
  const [selectedHall, setSelectedHall] = useState<{ id: string; name: string } | null>(null);
  const { profile, isAdmin, canManageData } = useAuth();
  const queryClient = useQueryClient();

  const { data: halls, isLoading } = useQuery({
    queryKey: ['halls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('halls')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Hall[];
    }
  });

  const getCapacityVariant = (capacity: number) => {
    if (capacity >= 70) return 'capacity-high';
    if (capacity >= 40) return 'capacity-medium';
    return 'capacity-low';
  };

  const getCapacityLabel = (capacity: number) => {
    if (capacity >= 70) return 'سعة كبيرة';
    if (capacity >= 40) return 'سعة متوسطة';
    return 'سعة صغيرة';
  };

  const handleHallClick = (hall: Hall) => {
    setSelectedHall({ id: hall.id, name: hall.name });
  };

  const deleteMutation = useMutation({
    mutationFn: async (hallId: string) => {
      const { error } = await supabase
        .from('halls')
        .delete()
        .eq('id', hallId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['halls'] });
      toast.success('تم حذف القاعة بنجاح');
    },
    onError: (error) => {
      toast.error('حدث خطأ أثناء حذف القاعة');
      console.error('Error deleting hall:', error);
    }
  });

  const handleDelete = (e: React.MouseEvent, hallId: string) => {
    e.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذه القاعة؟')) {
      deleteMutation.mutate(hallId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        userRole={profile?.user_role} 
        userName={profile?.full_name || profile?.email || undefined}
        isAdmin={isAdmin}
      />
      
      <main className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">إدارة القاعات</h1>
            <p className="text-muted-foreground mt-2">
              عرض وإدارة القاعات في النظام
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              <span className="font-semibold">{halls?.length || 0} قاعة</span>
            </div>
            {canManageData && <AddHallModal />}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="card-elevated">
                <CardHeader className="pb-3">
                  <div className="h-6 bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : halls?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">لا توجد قاعات</h3>
              <p className="text-muted-foreground">
                لم يتم إضافة أي قاعات في النظام بعد
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {halls?.map((hall) => (
              <Card 
                key={hall.id} 
                className="card-elevated hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleHallClick(hall)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{hall.name}</span>
                    <div className="flex items-center gap-2">
                      {canManageData && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <AddHallModal hall={hall} isEdit={true} />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleDelete(e, hall.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">السعة:</span>
                      <span className="font-semibold text-primary">{hall.capacity} طالب</span>
                    </div>
                    
                    <div className={`capacity-indicator ${getCapacityVariant(hall.capacity)}`}>
                      {getCapacityLabel(hall.capacity)}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      تم الإنشاء: {formatShortArabicDate(hall.created_at)}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      انقر لعرض الجدول الأسبوعي
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <HallScheduleModal
          hallId={selectedHall?.id || null}
          hallName={selectedHall?.name || ""}
          isOpen={!!selectedHall}
          onClose={() => setSelectedHall(null)}
        />
      </main>
    </div>
  );
};

export default HallsPage;
