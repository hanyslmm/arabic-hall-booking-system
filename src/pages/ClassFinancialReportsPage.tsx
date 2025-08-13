import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DollarSign, TrendingUp, Users, PieChart } from 'lucide-react';
import { studentRegistrationsApi } from '@/api/students';
import { useAuth } from '@/hooks/useAuth';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { UnifiedLayout } from '@/components/layout/UnifiedLayout';

export default function ClassFinancialReportsPage() {
  const { profile, isAdmin } = useAuth();

  // Fetch all registrations for financial analysis
  const { data: registrations, isLoading } = useQuery({
    queryKey: ['all-registrations'],
    queryFn: studentRegistrationsApi.getAll,
  });

  if (isLoading) {
    return (
      <UnifiedLayout>
        <LoadingSpinner />
      </UnifiedLayout>
    );
  }

  // Calculate financial statistics
  const totalRegistrations = registrations?.length || 0;
  const totalExpectedRevenue = registrations?.reduce((sum, reg) => sum + (reg.total_fees || 0), 0) || 0;
  const totalActualRevenue = registrations?.reduce((sum, reg) => sum + (reg.paid_amount || 0), 0) || 0;
  const totalPending = totalExpectedRevenue - totalActualRevenue;

  const paidCount = registrations?.filter(reg => reg.payment_status === 'paid').length || 0;
  const partialCount = registrations?.filter(reg => reg.payment_status === 'partial').length || 0;
  const pendingCount = registrations?.filter(reg => reg.payment_status === 'pending').length || 0;

  const collectionRate = totalExpectedRevenue > 0 ? (totalActualRevenue / totalExpectedRevenue) * 100 : 0;

  // Group by booking for class-wise analysis
  const classSummary = registrations?.reduce((acc: Record<string, any>, reg) => {
    const classKey = `${reg.booking?.halls?.name} - ${reg.booking?.teachers?.name}`;
    if (!acc[classKey]) {
      acc[classKey] = {
        className: classKey,
        studentCount: 0,
        totalFees: 0,
        totalPaid: 0,
        registrations: []
      };
    }
    acc[classKey].studentCount += 1;
    acc[classKey].totalFees += reg.total_fees || 0;
    acc[classKey].totalPaid += reg.paid_amount || 0;
    acc[classKey].registrations.push(reg);
    return acc;
  }, {}) || {};

  const classData = Object.values(classSummary);

  // Prepare chart data
  const barData = classData.map((c: any) => ({
    name: c.className,
    paid: c.totalPaid,
    remaining: Math.max(0, c.totalFees - c.totalPaid),
  }));

  return (
    <UnifiedLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">التقارير المالية للصفوف</h1>
          <p className="text-muted-foreground mt-2">نظرة عامة على الوضع المالي للصفوف المسجلة</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الإيرادات المتوقعة</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalExpectedRevenue.toLocaleString()} جنيه</div>
              <p className="text-xs text-muted-foreground">إجمالي الرسوم المتوقعة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الإيرادات الفعلية</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalActualRevenue.toLocaleString()} جنيه</div>
              <p className="text-xs text-muted-foreground">المدفوع حتى الآن</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المتبقي</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{totalPending.toLocaleString()} جنيه</div>
              <p className="text-xs text-muted-foreground">المبلغ المتبقي للتحصيل</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">نسبة التحصيل</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{collectionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">من إجمالي الرسوم</p>
            </CardContent>
          </Card>
        </div>

        {/* Class-wise chart */}
        <Card>
          <CardHeader>
            <CardTitle>مقارنة الإيرادات حسب الصف</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer>
              <BarChart width={800} height={300} data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Bar dataKey="paid" fill="#22c55e" name="المدفوع" />
                <Bar dataKey="remaining" fill="#f59e0b" name="المتبقي" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </UnifiedLayout>
  );
}