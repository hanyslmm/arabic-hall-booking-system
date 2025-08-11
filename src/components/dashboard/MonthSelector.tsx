import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, RotateCcw } from "lucide-react";

interface MonthSelectorProps {
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number, year: number) => void;
}

export const MonthSelector = ({ selectedMonth, selectedYear, onMonthChange }: MonthSelectorProps) => {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const isCurrentMonth = selectedMonth === currentMonth && selectedYear === currentYear;

  // Generate year options (current year ± 2 years)
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

  const resetToCurrentMonth = () => {
    onMonthChange(currentMonth, currentYear);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          اختيار الشهر
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="space-y-2">
            <label className="text-sm font-medium">الشهر</label>
            <Select 
              value={selectedMonth.toString()} 
              onValueChange={(value) => onMonthChange(parseInt(value), selectedYear)}
            >
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

          <div className="space-y-2">
            <label className="text-sm font-medium">السنة</label>
            <Select 
              value={selectedYear.toString()} 
              onValueChange={(value) => onMonthChange(selectedMonth, parseInt(value))}
            >
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

          {!isCurrentMonth && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetToCurrentMonth}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              العودة للشهر الحالي
            </Button>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {isCurrentMonth 
                ? "الشهر الحالي" 
                : `${monthOptions.find(m => m.value === selectedMonth)?.label} ${selectedYear}`
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};