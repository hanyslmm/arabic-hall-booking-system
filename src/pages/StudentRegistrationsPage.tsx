import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchIcon, CreditCard, Users, Clock, Calendar, Filter } from 'lucide-react';
import { studentRegistrationsApi } from '@/api/students';
import { useTableData } from '@/hooks/useTableData';
import { PaginatedTable } from '@/components/common/PaginatedTable';
import { FastReceptionistModal } from '@/components/receptionist/FastReceptionistModal';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

export default function StudentRegistrationsPage() {
  const { profile } = useAuth();
  const [showFastModal, setShowFastModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterByMonth, setFilterByMonth] = useState<boolean>(false);

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['student-registrations', filterByMonth, selectedYear, selectedMonth],
    queryFn: () => {
      if (filterByMonth) {
        return studentRegistrationsApi.getByMonth(selectedYear, selectedMonth);
      }
      return studentRegistrationsApi.getAll();
    }
  });

  const tableData = useTableData({
    data: registrations,
    searchFields: ['student_id', 'payment_status'],
    initialPageSize: 25
  });

  // Generate year options (current year ± 2 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Month options in Arabic
  const monthOptions = [
    { value: 1, label: 'يناير' },
    { value: 2, label: 'فبراير' },
    { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' },
    { value: 5, label: 'مايو' },
    { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' },
    { value: 8, label: 'أغسطس' },
    { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' },
    { value: 11, label: 'نوفمبر' },
    { value: 12, label: 'ديسمبر' },
  ];

  // Check if user can register students (not teachers)
  const canRegisterStudents = profile?.user_role !== 'teacher';

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8" />
          تسجيلات الطلاب
        </h1>
        {canRegisterStudents && (
          <Button onClick={() => setShowFastModal(true)} className="bg-green-600 hover:bg-green-700">
            <Clock className="h-4 w-4 mr-2" />
            التسجيل السريع
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            الفلاتر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex items-center space-x-2 space-x-reverse">
              <input
                type="checkbox"
                id="filter-by-month"
                checked={filterByMonth}
                onChange={(e) => setFilterByMonth(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="filter-by-month" className="text-sm font-medium">
                تصفية حسب الشهر
              </label>
            </div>
            
            {filterByMonth && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">السنة</label>
                  <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">الشهر</label>
                  <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex gap-2 items-center">
        <Input
          placeholder="البحث في التسجيلات..."
          value={tableData.searchTerm}
          onChange={(e) => tableData.setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
        
        {/* Results Summary */}
        {filterByMonth && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {monthOptions.find(m => m.value === selectedMonth)?.label} {selectedYear} - 
              {registrations.length} تسجيل
            </span>
          </div>
        )}
      </div>

      <PaginatedTable
        data={tableData.paginatedData}
        columns={[
          {
            key: 'student_id',
            header: 'رقم الطالب',
            render: (item: any) => <Badge variant="outline">{item.student_id?.slice(-8)}</Badge>
          },
          {
            key: 'student_name',
            header: 'اسم الطالب',
            render: (item: any) => item.student?.name || '-'
          },
          {
            key: 'total_fees',
            header: 'الرسوم',
            render: (item: any) => `${item.total_fees} LE`
          },
          {
            key: 'payment_status',
            header: 'حالة الدفع',
            render: (item: any) => {
              const variants = { paid: 'default', partial: 'secondary', pending: 'destructive' } as const;
              const variant = variants[item.payment_status as keyof typeof variants] || 'outline';
              return <Badge variant={variant}>{item.payment_status}</Badge>;
            }
          },
          {
            key: 'created_at',
            header: 'تاريخ التسجيل',
            render: (item: any) => {
              const date = new Date(item.created_at);
              return format(date, 'dd/MM/yyyy');
            }
          }
        ]}
        getRowKey={(item: any) => item.student_id || item.id}
        isLoading={isLoading}
        emptyMessage="لا توجد تسجيلات"
      />

      <FastReceptionistModal isOpen={showFastModal} onClose={() => setShowFastModal(false)} />
    </div>
  );
}