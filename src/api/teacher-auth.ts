import { supabase } from "@/integrations/supabase/client";

export interface TeacherStatistics {
  total_students: number;
  total_classes: number;
  total_earnings: number;
  monthly_earnings: number;
  pending_payments: number;
  attendance_rate: number;
}

export interface TeacherLoginData {
  username: string;
  password: string;
}

export interface TeacherProfile {
  id: string;
  username: string;
  teacher_id: string;
  teacher_name: string;
  user_role: 'teacher';
}

export const teacherAuthApi = {
  // Get teacher statistics with optional month/year parameters
  getStatistics: async (teacherId: string, month?: number, year?: number): Promise<TeacherStatistics> => {
    const { data, error } = await supabase.rpc('get_teacher_statistics_by_month', {
      p_teacher_id: teacherId,
      p_month: month || new Date().getMonth() + 1,
      p_year: year || new Date().getFullYear()
    });
    
    if (error) {
      // Fallback to original function if new one doesn't exist yet
      console.warn('New function not available, using fallback:', error);
      const { data: fallbackData, error: fallbackError } = await supabase.rpc('get_teacher_statistics', {
        p_teacher_id: teacherId
      });
      if (fallbackError) throw fallbackError;
      const fallbackResult = fallbackData[0];
      return {
        total_students: Number(fallbackResult?.total_students || 0),
        total_classes: Number(fallbackResult?.total_classes || 0),
        total_earnings: Number(fallbackResult?.total_earnings || 0),
        monthly_earnings: Number(fallbackResult?.monthly_earnings || 0),
        pending_payments: Number(fallbackResult?.pending_payments || 0),
        attendance_rate: Number(fallbackResult?.attendance_rate || 85)
      };
    }
    
    return {
      total_students: Number(data[0]?.total_students || 0),
      total_classes: Number(data[0]?.total_classes || 0),
      total_earnings: Number(data[0]?.total_earnings || 0),
      monthly_earnings: Number(data[0]?.monthly_earnings || 0),
      pending_payments: Number(data[0]?.pending_payments || 0),
      attendance_rate: Number(data[0]?.attendance_rate || 85)
    };
  },

  // Get teacher bookings - fixed to filter by current teacher
  getMyBookings: async (teacherId: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        halls(name),
        teachers(name),
        academic_stages(name)
      `)
      .eq('teacher_id', teacherId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get teacher student registrations - fixed to filter by current teacher
  getMyStudentRegistrations: async (teacherId: string) => {
    const { data, error } = await supabase
      .from('student_registrations')
      .select(`
        *,
        students(name, mobile_phone, serial_number),
        bookings!inner(class_code, start_time, days_of_week, teacher_id),
        payment_records(amount, payment_date)
      `)
      .eq('bookings.teacher_id', teacherId)
      .order('registration_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get teacher payment records - fixed to filter by current teacher
  getMyPaymentRecords: async (teacherId: string) => {
    const { data, error } = await supabase
      .from('payment_records')
      .select(`
        *,
        student_registrations!inner(
          students(name, mobile_phone),
          bookings!inner(class_code, teacher_id)
        )
      `)
      .eq('student_registrations.bookings.teacher_id', teacherId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data;
  }
};