import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/Navbar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DollarSign, TrendingUp, Users, PieChart } from 'lucide-react';
import { studentRegistrationsApi } from '@/api/students';
import { useAuth } from '@/hooks/useAuth';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function ClassFinancialReportsPage() {
  const { profile, isAdmin } = useAuth();

  // Fetch all registrations for financial analysis
  const { data: registrations, isLoading } = useQuery({
    queryKey: ['all-registrations'],
    queryFn: studentRegistrationsApi.getAll,
  });

  if (isLoading) {
    return <LoadingSpinner />;
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
    <div className="min-h-screen bg-background">
      <Navbar 
        userRole={profile?.user_role} 
        userName={profile?.full_name || profile?.email || undefined}
        isAdmin={isAdmin}
      />
      
      <div className="container mx-auto py-8">
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
              <p className="text-xs text-muted-foreground">من {totalRegistrations} تسجيل</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المحصل</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalActualRevenue.toLocaleString()} جنيه</div>
              <p className="text-xs text-muted-foreground">معدل التحصيل {collectionRate.toFixed(1)}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المبلغ المتبقي</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{totalPending.toLocaleString()} جنيه</div>
              <p className="text-xs text-muted-foreground">في انتظار التحصيل</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">حالة المدفوعات</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>مدفوع كاملاً</span>
                  <span className="text-green-600">{paidCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>مدفوع جزئياً</span>
                  <span className="text-yellow-600">{partialCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>غير مدفوع</span>
                  <span className="text-red-600">{pendingCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Class-wise Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>التقرير المالي حسب المجموعة</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Stacked Bar Chart */}
            {barData.length > 0 ? (
              <ChartContainer
                config={{
                  paid: { label: 'المحصل', color: 'hsl(var(--chart-2))' },
                  remaining: { label: 'المتبقي', color: 'hsl(var(--chart-1))' },
                }}
                className="h-80 w-full"
              >
                <BarChart data={barData} margin={{ left: 8, right: 8, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} height={60} />
                  <YAxis tickFormatter={(v) => v.toLocaleString()} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="paid" stackId="a" fill="var(--color-paid)" radius={[4,4,0,0]} />
                  <Bar dataKey="remaining" stackId="a" fill="var(--color-remaining)" radius={[4,4,0,0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">لا توجد بيانات مالية متاحة</p>
              </div>
            )}

            {/* Per-class details */}
            <div className="space-y-4 mt-8">
              {classData.map((classInfo: any, index) => {
                const collectionRate = classInfo.totalFees > 0 ? (classInfo.totalPaid / classInfo.totalFees) * 100 : 0;
                const remaining = classInfo.totalFees - classInfo.totalPaid;
                
                return (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{classInfo.className}</h3>
                      <Badge 
                        variant={collectionRate === 100 ? 'default' : collectionRate > 50 ? 'secondary' : 'destructive'}
                      >
                        {collectionRate.toFixed(1)}% محصل
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">عدد الطلاب</p>
                        <p className="text-xl font-bold">{classInfo.studentCount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">إجمالي الرسوم</p>
                        <p className="text-xl font-bold">{classInfo.totalFees.toLocaleString()} جنيه</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">المحصل</p>
                        <p className="text-xl font-bold text-green-600">{classInfo.totalPaid.toLocaleString()} جنيه</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">المتبقي</p>
                        <p className="text-xl font-bold text-orange-600">{remaining.toLocaleString()} جنيه</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(collectionRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {classData.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">لا توجد بيانات مالية متاحة</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}