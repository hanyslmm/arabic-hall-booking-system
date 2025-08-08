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

export function ReceptionistDashboard() {
  const [showFastModal, setShowFastModal] = useState(false);

  // Get today's registrations count using server-side count (no 1000-row cap)
  const { data: todayRegistrationsCount = 0 } = useQuery({
    queryKey: ['today-registrations-count'],
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
    }
  });

  const { data: pendingPayments } = useQuery({
    queryKey: ['pending-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_registrations')
        .select('*')
        .in('payment_status', ['pending', 'partial'])
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    }
  });

  const { data: pendingPaymentsCount = 0 } = useQuery({
    queryKey: ['pending-payments-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('student_registrations')
        .select('*', { count: 'exact', head: true })
        .in('payment_status', ['pending', 'partial']);
      if (error) throw error;
      return count || 0;
    }
  });

  const { data: halls } = useQuery({
    queryKey: ['halls-occupancy'],
    queryFn: hallsApi.getAll
  });

  // Current month earnings (sum of payment_records.amount for this month)
  const { data: monthlyEarnings } = useQuery({
    queryKey: ['monthly-earnings'],
    queryFn: async () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

      const { data, error } = await supabase
        .from('payment_records')
        .select('amount,payment_date')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);

      if (error) throw error;
      return (data || []).reduce((sum: number, r: { amount: number }) => sum + (r.amount || 0), 0);
    }
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">لوحة الاستقبال</h1>
          <p className="text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM dd, yyyy')}
          </p>
        </div>
        <Button 
          onClick={() => setShowFastModal(true)}
          size="lg"
          className="bg-green-600 hover:bg-green-700"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <Card 
            key={index} 
            className="cursor-pointer hover:shadow-lg transition-shadow group"
            onClick={action.action}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
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
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {pendingPayments.map((reg) => (
                <div key={reg.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">طالب #{reg.student_id}</div>
                    <div className="text-sm text-muted-foreground">
                      الرسوم: {reg.total_fees} LE - المدفوع: {reg.paid_amount} LE
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={reg.payment_status === 'pending' ? 'destructive' : 'secondary'}>
                      {reg.payment_status === 'pending' ? 'معلق' : 'جزئي'}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">
                      المتبقي: {reg.total_fees - reg.paid_amount} LE
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {pendingPaymentsCount > 10 && (
              <div className="text-center mt-3">
                <Button variant="outline" onClick={() => window.location.href = '/student-registrations'}>
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
      />
    </div>
  );
}