import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { studentsApi, studentRegistrationsApi, Student } from "@/api/students";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, User, Plus } from "lucide-react";
import { formatTimeAmPm } from "@/utils/dateUtils";

interface RegisterStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Booking {
  id: string;
  hall_id: string;
  teacher_id: string;
  academic_stage_id: string;
  start_time: string;
  days_of_week: string[];
  number_of_students: number;
  class_fees?: number | null;
  is_custom_fee?: boolean;
  halls?: { name: string };
  teachers?: { name: string };
  academic_stages?: { name: string };
}

export const RegisterStudentModal = ({ isOpen, onClose }: RegisterStudentModalProps) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedBooking, setSelectedBooking] = useState("");
  const [totalFees, setTotalFees] = useState("");
  const [notes, setNotes] = useState("");
  const [newStudentMode, setNewStudentMode] = useState(false);
  const [newStudentData, setNewStudentData] = useState({
    name: "",
    mobile_phone: "",
    parent_phone: "",
    city: "",
  });

  // Fetch active bookings
  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings-for-registration"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          halls(name),
          teachers(name),
          academic_stages(name)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Booking[];
    },
  });

  const searchMutation = useMutation({
    mutationFn: studentsApi.search,
    onError: () => {
      toast.error("فشل في البحث عن الطالب");
    }
  });

  const createStudentMutation = useMutation({
    mutationFn: studentsApi.create,
    onSuccess: (data) => {
      setSelectedStudent(data);
      setNewStudentMode(false);
      toast.success(`تم إنشاء الطالب بنجاح - الرقم التسلسلي: ${data.serial_number}`);
    },
    onError: (error: any) => {
      if (error.message?.includes('mobile_phone')) {
        toast.error("رقم الهاتف مستخدم من قبل طالب آخر");
      } else {
        toast.error("فشل في إنشاء الطالب");
      }
    }
  });

  const registerMutation = useMutation({
    mutationFn: studentRegistrationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-registrations"] });
      toast.success("تم تسجيل الطالب في الدورة بنجاح");
      handleClose();
    },
    onError: (error: any) => {
      if (error.message?.includes('student_id, booking_id')) {
        toast.error("الطالب مسجل بالفعل في هذه الدورة");
      } else {
        toast.error("فشل في تسجيل الطالب");
      }
    }
  });

  const handleSearch = () => {
    if (searchTerm.trim()) {
      searchMutation.mutate(searchTerm.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleCreateNewStudent = () => {
    if (!newStudentData.name.trim() || !newStudentData.mobile_phone.trim()) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const phoneRegex = /^[0-9+\-\s()]+$/;
    if (!phoneRegex.test(newStudentData.mobile_phone)) {
      toast.error("يرجى إدخال رقم هاتف صحيح");
      return;
    }

    createStudentMutation.mutate({
      name: newStudentData.name.trim(),
      mobile_phone: newStudentData.mobile_phone.trim(),
      parent_phone: newStudentData.parent_phone.trim() || undefined,
      city: newStudentData.city.trim() || undefined,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudent) {
      toast.error("يرجى اختيار طالب");
      return;
    }

    if (!selectedBooking) {
      toast.error("يرجى اختيار دورة");
      return;
    }

    const selectedBookingObj = bookings.find((b) => b.id === selectedBooking);
    const resolvedFees = totalFees.trim() !== "" ? parseFloat(totalFees) : (selectedBookingObj?.class_fees || 0);

    registerMutation.mutate({
      student_id: selectedStudent.id,
      booking_id: selectedBooking,
      total_fees: resolvedFees,
      notes: notes.trim() || undefined,
    });
  };

  const handleClose = () => {
    setSearchTerm("");
    setSelectedStudent(null);
    setSelectedBooking("");
    setTotalFees("");
    setNotes("");
    setNewStudentMode(false);
    setNewStudentData({
      name: "",
      mobile_phone: "",
      parent_phone: "",
      city: "",
    });
    searchMutation.reset();
    onClose();
  };

  const getDaysInArabic = (days: string[]) => {
    const daysMap: { [key: string]: string } = {
      'sunday': 'الأحد',
      'monday': 'الاثنين',
      'tuesday': 'الثلاثاء',
      'wednesday': 'الأربعاء',
      'thursday': 'الخميس',
      'friday': 'الجمعة',
      'saturday': 'السبت'
    };
    return days.map(day => daysMap[day]).join(', ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تسجيل طالب في دورة</DialogTitle>
          <DialogDescription>
            ابحث عن طالب موجود أو أنشئ طالب جديد وسجله في إحدى الدورات المتاحة
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student Search/Create Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">اختيار الطالب</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNewStudentMode(!newStudentMode)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {newStudentMode ? "إلغاء" : "طالب جديد"}
              </Button>
            </div>

            {newStudentMode ? (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-name">الاسم *</Label>
                      <Input
                        id="new-name"
                        placeholder="اسم الطالب"
                        value={newStudentData.name}
                        onChange={(e) => setNewStudentData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-mobile">رقم الهاتف *</Label>
                      <Input
                        id="new-mobile"
                        placeholder="رقم هاتف الطالب"
                        value={newStudentData.mobile_phone}
                        onChange={(e) => setNewStudentData(prev => ({ ...prev, mobile_phone: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-parent">هاتف ولي الأمر</Label>
                      <Input
                        id="new-parent"
                        placeholder="رقم هاتف ولي الأمر"
                        value={newStudentData.parent_phone}
                        onChange={(e) => setNewStudentData(prev => ({ ...prev, parent_phone: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-city">المدينة</Label>
                      <Input
                        id="new-city"
                        placeholder="المدينة"
                        value={newStudentData.city}
                        onChange={(e) => setNewStudentData(prev => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleCreateNewStudent}
                    disabled={createStudentMutation.isPending}
                    className="w-full"
                  >
                    {createStudentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    إنشاء الطالب
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="رقم الهاتف أو الرقم التسلسلي..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleSearch}
                    disabled={searchMutation.isPending}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>

                {searchMutation.data && searchMutation.data.length > 0 && (
                  <div className="space-y-2">
                    <Label>نتائج البحث</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {searchMutation.data.map((student) => (
                        <Card 
                          key={student.id} 
                          className={`cursor-pointer transition-colors ${
                            selectedStudent?.id === student.id ? 'ring-2 ring-primary' : 'hover:bg-muted'
                          }`}
                          onClick={() => setSelectedStudent(student)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <User className="h-5 w-5 text-muted-foreground" />
                              <div className="flex-1">
                                <p className="font-medium">{student.name}</p>
                                <div className="flex gap-2 text-sm text-muted-foreground">
                                  <Badge variant="outline">{student.serial_number}</Badge>
                                  <span>{student.mobile_phone}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {selectedStudent && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-600">الطالب المختار: {selectedStudent.name}</p>
                          <div className="flex gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{selectedStudent.serial_number}</Badge>
                            <span>{selectedStudent.mobile_phone}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Booking Selection */}
          <div className="space-y-2">
            <Label htmlFor="booking">اختيار الدورة *</Label>
            <Select value={selectedBooking} onValueChange={(value)=>{
              setSelectedBooking(value);
              const b = bookings.find((bk)=> bk.id === value);
              if (b) {
                setTotalFees((b.class_fees ?? 0).toString());
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="اختر دورة للتسجيل بها" />
              </SelectTrigger>
              <SelectContent>
                {bookings.map((booking) => (
                  <SelectItem key={booking.id} value={booking.id}>
                    <div className="text-right">
                      <p className="font-medium">
                        {booking.halls?.name} - {booking.teachers?.name}
                      </p>
                       <p className="text-sm text-muted-foreground">
                         {booking.academic_stages?.name} | {getDaysInArabic(booking.days_of_week)} | 
                         {booking.start_time ? 
                           formatTimeAmPm(booking.start_time) : ''
                         }
                         {typeof booking.class_fees !== 'undefined' && (
                           <> | الرسوم: {booking.class_fees || 0} LE</>
                         )}
                       </p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fees */}
          <div className="space-y-2">
            <Label htmlFor="fees">الرسوم الإجمالية (LE)</Label>
            <Input
              id="fees"
              type="number"
              step="0.01"
              min="0"
              placeholder={selectedBooking ? (bookings.find(b=>b.id===selectedBooking)?.class_fees ?? 0).toString() : "0.00"}
              value={totalFees}
              onChange={(e) => setTotalFees(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              placeholder="ملاحظات إضافية..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              إلغاء
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedStudent || !selectedBooking || registerMutation.isPending}
            >
              {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              تسجيل الطالب
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};