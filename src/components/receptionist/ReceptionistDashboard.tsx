import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Users, 
  CreditCard, 
  Search, 
  UserPlus, 
  FileText,
  Zap,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { FastReceptionistModal } from './FastReceptionistModal';
import { useQuery } from '@tanstack/react-query';
import { studentRegistrationsApi } from '@/api/students';
import { hallsApi } from '@/utils/refactored-api';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function ReceptionistDashboard() {
  const [showFastModal, setShowFastModal] = useState(false);
  const [fastModalStudentId, setFastModalStudentId] = useState<string | undefined>(undefined);
  const { user } = useAuth();

  // Get today's registrations count using server-side count (no 1000-row cap)
  const { data: todayRegistrationsCount = 0 } = useQuery({
    queryKey: ['today-registrations-count', user?.id],
    queryFn: async () => {
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0, 0, 0, 0
      ).toISOString();
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23, 59, 59, 999
      ).toISOString();

      const { count, error } = await supabase
        .from('student_registrations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: pendingPayments } = useQuery({
    queryKey: ['pending-payments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_registrations')
        .select(`
          id,
          student_id,
          total_fees,
          paid_amount,
          payment_status,
          created_at,
          student:students(name, serial_number)
        `)
        .in('payment_status', ['pending', 'partial'])
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: pendingPaymentsCount = 0 } = useQuery({
    queryKey: ['pending-payments-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('student_registrations')
        .select('*', { count: 'exact', head: true })
        .in('payment_status', ['pending', 'partial']);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: halls } = useQuery({
    queryKey: ['halls-occupancy', user?.id],
    queryFn: hallsApi.getAll,
    enabled: !!user,
    staleTime: 30_000,
  });

  // Current month earnings with robust fallback (no 1000-row cap)
  const { data: monthlyEarnings } = useQuery({
    queryKey: ['monthly-earnings', user?.id],
    queryFn: async () => {
      const { fetchMonthlyEarnings } = await import('@/utils/finance');
      return await fetchMonthlyEarnings();
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const quickActions = [
    {
      title: 'التسجيل السريع',
      description: 'بحث وتسجيل دفعات بسرعة',
      icon: Zap,
      color: 'bg-green-500',
      action: () => setShowFastModal(true)
    },
    {
      title: 'بحث الطلاب',
      description: 'البحث في قاعدة بيانات الطلاب',
      icon: Search,
      color: 'bg-blue-500',
      action: () => window.location.href = '/students'
    },
    {
      title: 'التسجيلات',
      description: 'إدارة تسجيلات الطلاب',
      icon: UserPlus,
      color: 'bg-purple-500',
      action: () => window.location.href = '/student-registrations'
    },
    {
      title: 'التقارير',
      description: 'عرض التقارير المالية',
      icon: FileText,
      color: 'bg-orange-500',
      action: () => window.location.href = '/reports'
    }
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">الاستقبال</h1>
          <p className="text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM dd, yyyy')}
          </p>
        </div>
        <Button 
          onClick={() => setShowFastModal(true)}
          size="lg"
          className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
        >
          <Zap className="h-5 w-5 mr-2" />
          التسجيل السريع
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تسجيلات اليوم</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayRegistrationsCount}</div>
            <p className="text-xs text-muted-foreground">
              تسجيل جديد اليوم
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">دفعات معلقة</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingPaymentsCount}
            </div>
            <p className="text-xs text-muted-foreground">
              تحتاج متابعة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">القاعات النشطة</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{halls?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              قاعة متاحة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إيرادات هذا الشهر</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(monthlyEarnings || 0).toLocaleString()} LE
            </div>
            <p className="text-xs text-muted-foreground">
              إجمالي المدفوع خلال الشهر
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <Card 
            key={index} 
            className="cursor-pointer hover:shadow-lg transition-shadow group"
            onClick={action.action}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`${action.color} p-3 rounded-lg text-white group-hover:scale-110 transition-transform`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Pending Payments */}
      {pendingPayments && pendingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              الدفعات المعلقة - تحتاج متابعة
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              تظهر هنا التسجيلات التي لم تُسدَّد رسومها بالكامل. انقر "تحصيل" لاتخاذ الإجراء الآن.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {pendingPayments.map((reg: any) => (
                <div
                  key={reg.id}
                  className="p-4 rounded-lg border border-border bg-card/50 border-r-4 border-orange-400"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col text-right">
                      <span className="font-semibold text-sm md:text-base">
                        {reg?.student?.name || `طالب #${reg.student_id}`}
                      </span>
                      {reg?.student?.serial_number && (
                        <Badge variant="secondary" className="mt-1 w-fit ml-auto">
                          {reg.student.serial_number}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={reg.payment_status === 'pending' ? 'destructive' : 'secondary'}>
                        {reg.payment_status === 'pending' ? 'معلق' : 'جزئي'}
                      </Badge>
                      <Button size="sm" className="w-full sm:w-auto" onClick={() => { setFastModalStudentId(reg.student_id); setShowFastModal(true); }}>
                        تحصيل
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground justify-end">
                    <span>الرسوم: {reg.total_fees}</span>
                    <span>المدفوع: {reg.paid_amount}</span>
                    <span>المتبقي: {reg.total_fees - reg.paid_amount}</span>
                  </div>
                </div>
              ))}
            </div>
            {pendingPaymentsCount > 10 && (
              <div className="text-center mt-3">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => window.location.href = '/student-registrations'}>
                  عرض الكل ({pendingPaymentsCount})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <FastReceptionistModal 
        isOpen={showFastModal} 
        onClose={() => setShowFastModal(false)} 
        initialStudentId={fastModalStudentId}
      />
    </div>
  );
}