import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnifiedLayout } from "@/components/layout/UnifiedLayout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export function SettingsPage() {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [duration, setDuration] = useState("");

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*');
      
      if (error) throw error;
      return data as Array<{ key: string; value: string }>;
    },
    enabled: !!user,
  });

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('settings')
        .update({ value })
        .eq('key', key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "إعدادات محدثة",
        description: "تم تحديث الإعدادات بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "فشل في تحديث الإعدادات",
        variant: "destructive",
      });
      console.error('Settings update error:', error);
    }
  });

  useEffect(() => {
    if (settings) {
      const durationSetting = settings.find(s => s.key === 'default_booking_duration_minutes');
      if (durationSetting) {
        setDuration(durationSetting.value || '60');
      }
    }
  }, [settings]);

  // Auth checks AFTER hooks
  if (loading) {
    return (
      <UnifiedLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-lg">جاري التحميل...</div>
        </div>
      </UnifiedLayout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (profile?.user_role !== 'owner' && profile?.user_role !== 'manager') {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!duration || isNaN(Number(duration)) || Number(duration) < 1) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مدة صالحة بالدقائق",
        variant: "destructive",
      });
      return;
    }

    updateSettingMutation.mutate({
      key: 'default_booking_duration_minutes',
      value: duration
    });
  };

  if (isLoading) {
    return (
      <UnifiedLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-lg">جاري التحميل...</div>
        </div>
      </UnifiedLayout>
    );
  }

  return (
    <UnifiedLayout>
      <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">إعدادات النظام</h1>
          
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الحجز</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">مدة الحجز الافتراضية (بالدقائق)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="60"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    ستستخدم هذه المدة كوقت افتراضي عند إنشاء حجز جديد
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  disabled={updateSettingMutation.isPending}
                  className="w-full"
                >
                  {updateSettingMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </Button>
              </form>
            </CardContent>
          </Card>
      </div>
    </UnifiedLayout>
  );
}