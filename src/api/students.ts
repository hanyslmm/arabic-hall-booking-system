import { supabase } from "@/integrations/supabase/client";

export interface Student {
  id: string;
  serial_number: string;
  name: string;
  mobile_phone: string;
  parent_phone?: string;
  city?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface StudentRegistration {
  id: string;
  student_id: string;
  booking_id: string;
  registration_date: string;
  payment_status: 'pending' | 'partial' | 'paid';
  total_fees: number;
  paid_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  student?: Student;
  booking?: {
    id: string;
    hall_id: string;
    teacher_id: string;
    academic_stage_id: string;
    start_time: string;
    days_of_week: string[];
    number_of_students: number;
    class_code?: string;
    halls?: { name: string };
    teachers?: { name: string };
    academic_stages?: { name: string };
  };
}

export interface AttendanceRecord {
  id: string;
  student_registration_id: string;
  attendance_date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  created_at: string;
  created_by?: string;
}

export interface PaymentRecord {
  id: string;
  student_registration_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'card' | 'transfer' | 'other';
  reference_number?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

// Students API
export const studentsApi = {
  async getAll(): Promise<Student[]> {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data as Student[];
  },

  async getPaginated(params: { page: number; pageSize: number; searchTerm?: string }): Promise<{ data: Student[]; total: number; }>{
    const { page, pageSize, searchTerm } = params;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("students")
      .select("*", { count: 'exact' })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (searchTerm && searchTerm.trim().length > 0) {
      const term = searchTerm.trim();
      // Search by serial_number, name, or mobile_phone
      query = query.or(
        `serial_number.ilike.%${term}%,name.ilike.%${term}%,mobile_phone.ilike.%${term}%`
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: (data as Student[]) || [], total: count || 0 };
  },

  async create(studentData: {
    name: string;
    mobile_phone: string;
    parent_phone?: string;
    city?: string;
    serial_number?: string;
  }): Promise<Student> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("غير مصرح");
    
    const { data, error } = await supabase
      .from("students")
      .insert([{ 
        ...studentData, 
        created_by: user.user.id, 
        serial_number: studentData.serial_number || '' 
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data as Student;
  },

  async update(id: string, updates: Partial<Student>): Promise<Student> {
    const { data, error } = await supabase
      .from("students")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Student;
  },

  async delete(id: string): Promise<string> {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) throw error;
    return id;
  },

  async search(term: string): Promise<Student[]> {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .or(`serial_number.ilike.%${term}%,name.ilike.%${term}%,mobile_phone.ilike.%${term}%`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Student[];
  },

  async searchBySerialExact(term: string): Promise<Student[]> {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("serial_number", term)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Student[]) || [];
  },

  async searchFlexible(term: string): Promise<Student[]> {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .or(`serial_number.ilike.%${term}%,name.ilike.%${term}%,mobile_phone.ilike.%${term}%`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Student[]) || [];
  },
  
  async getById(id: string): Promise<Student | null> {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data as Student;
  },

  async bulkCreate(students: {
    name: string;
    mobile_phone: string;
    parent_phone?: string;
    city?: string;
  }[]): Promise<Student[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("غير مصرح");
    
    const studentsWithUser = students.map(student => ({
      ...student,
      created_by: user.user.id,
      serial_number: '', // Will be auto-generated by trigger
    }));
    
    const { data, error } = await supabase
      .from("students")
      .insert(studentsWithUser)
      .select();
    
    if (error) throw error;
    return data as Student[];
  }
};

// Student Registrations API
export const studentRegistrationsApi = {
  async getAll(): Promise<StudentRegistration[]> {
    const { data, error } = await supabase
      .from("student_registrations")
      .select(`
        *,
        student:students(*),
        booking:bookings(
          *,
          halls(name),
          teachers(name),
          academic_stages(name)
        )
      `)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data as StudentRegistration[];
  },

  async getByBooking(bookingId: string): Promise<StudentRegistration[]> {
    const { data, error } = await supabase
      .from("student_registrations")
      .select(`
        *,
        student:students(*),
        payment_records(amount, payment_date)
      `)
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data as StudentRegistration[];
  },

  async getByStudentWithPayments(studentId: string): Promise<StudentRegistration[]> {
    const { data, error } = await supabase
      .from("student_registrations")
      .select(`
        *,
        student:students(*),
        booking:bookings(
          *,
          halls(name),
          teachers(name),
          academic_stages(name)
        ),
        payment_records(amount, payment_date)
      `)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as StudentRegistration[];
  },

  async countByBookingId(bookingId: string): Promise<number> {
    const { count, error } = await supabase
      .from("student_registrations")
      .select("id", { count: 'exact', head: true })
      .eq("booking_id", bookingId);
    if (error) throw error;
    return count || 0;
  },

  async countByBookingIds(bookingIds: string[]): Promise<Record<string, number>> {
    if (!bookingIds || bookingIds.length === 0) return {};
    const { data, error } = await supabase
      .from("student_registrations")
      .select("booking_id")
      .in("booking_id", bookingIds);
    if (error) throw error;
    const map: Record<string, number> = {};
    (data as Array<{ booking_id: string }>).forEach(row => {
      map[row.booking_id] = (map[row.booking_id] || 0) + 1;
    });
    return map;
  },

  async create(registrationData: {
    student_id: string;
    booking_id: string;
    total_fees?: number;
    notes?: string;
  }): Promise<StudentRegistration> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("غير مصرح");
    
    const { data, error } = await supabase
      .from("student_registrations")
      .insert([{ ...registrationData, created_by: user.user.id }])
      .select(`
        *,
        student:students(*),
        booking:bookings(
          *,
          halls(name),
          teachers(name),
          academic_stages(name)
        )
      `)
      .single();
    
    if (error) throw error;
    return data as StudentRegistration;
  },

  async update(id: string, updates: Partial<{
    total_fees: number;
    notes: string;
  }>): Promise<StudentRegistration> {
    const { data, error } = await supabase
      .from("student_registrations")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        student:students(*),
        booking:bookings(
          *,
          halls(name),
          teachers(name),
          academic_stages(name)
        )
      `)
      .single();
    
    if (error) throw error;
    return data as StudentRegistration;
  },

  async delete(id: string): Promise<string> {
    const { error } = await supabase.from("student_registrations").delete().eq("id", id);
    if (error) throw error;
    return id;
  },

  async getByMonth(year: number, month: number): Promise<StudentRegistration[]> {
    // Create start and end dates for the month
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
    
    const { data, error } = await supabase
      .from("student_registrations")
      .select(`
        *,
        student:students(*),
        booking:bookings(
          *,
          halls(name),
          teachers(name),
          academic_stages(name)
        )
      `)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data as StudentRegistration[];
  },

  async updateFeesWithStatus(registrationId: string, newFees: number): Promise<StudentRegistration> {
    // Fetch current paid_amount to compute payment_status
    const { data: current, error: fetchError } = await supabase
      .from("student_registrations")
      .select("id, paid_amount")
      .eq("id", registrationId)
      .single();
    if (fetchError) throw fetchError;

    const paidAmount = current?.paid_amount || 0;
    const newStatus = paidAmount === 0 ? 'pending' : (paidAmount >= newFees ? 'paid' : 'partial');

    const { data, error } = await supabase
      .from("student_registrations")
      .update({ total_fees: newFees, payment_status: newStatus })
      .eq("id", registrationId)
      .select(`
        *,
        student:students(*),
        booking:bookings(
          *,
          halls(name),
          teachers(name),
          academic_stages(name)
        )
      `)
      .single();
    if (error) throw error;
    return data as StudentRegistration;
  },
};

// Attendance API
export const attendanceApi = {
  async getByRegistration(registrationId: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("student_registration_id", registrationId)
      .order("attendance_date", { ascending: false });
    
    if (error) throw error;
    return data as AttendanceRecord[];
  },

  async markPresentForDate(registrationId: string, attendanceDate: string): Promise<AttendanceRecord> {
    // Check if a record exists for this registration and date
    const { data: existing, error: selectError } = await supabase
      .from("attendance_records")
      .select("id, status")
      .eq("student_registration_id", registrationId)
      .eq("attendance_date", attendanceDate)
      .maybeSingle();
    if (selectError) throw selectError;

    if (existing) {
      const { data, error } = await supabase
        .from("attendance_records")
        .update({ status: 'present' })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return data as AttendanceRecord;
    }

    // Otherwise create a new record
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("غير مصرح");

    const { data, error } = await supabase
      .from("attendance_records")
      .insert([{ 
        student_registration_id: registrationId,
        attendance_date: attendanceDate,
        status: 'present',
        created_by: user.user.id,
      }])
      .select()
      .single();
    if (error) throw error;
    return data as AttendanceRecord;
  },

  async create(attendanceData: {
    student_registration_id: string;
    attendance_date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    notes?: string;
  }): Promise<AttendanceRecord> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("غير مصرح");
    
    const { data, error } = await supabase
      .from("attendance_records")
      .insert([{ ...attendanceData, created_by: user.user.id }])
      .select()
      .single();
    
    if (error) throw error;
    return data as AttendanceRecord;
  },

  async update(id: string, updates: Partial<{
    status: 'present' | 'absent' | 'late' | 'excused';
    notes: string;
  }>): Promise<AttendanceRecord> {
    const { data, error } = await supabase
      .from("attendance_records")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data as AttendanceRecord;
  },

  async bulkCreate(attendanceRecords: {
    student_registration_id: string;
    attendance_date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    notes?: string;
  }[]): Promise<AttendanceRecord[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("غير مصرح");
    
    const recordsWithUser = attendanceRecords.map(record => ({
      ...record,
      created_by: user.user.id,
    }));
    
    const { data, error } = await supabase
      .from("attendance_records")
      .insert(recordsWithUser)
      .select();
    
    if (error) throw error;
    return data as AttendanceRecord[];
  }
};

// Payments API
export const paymentsApi = {
  async getByRegistration(registrationId: string): Promise<PaymentRecord[]> {
    const { data, error } = await supabase
      .from("payment_records")
      .select("*")
      .eq("student_registration_id", registrationId)
      .order("payment_date", { ascending: false });
    
    if (error) throw error;
    return data as PaymentRecord[];
  },

  async create(paymentData: {
    student_registration_id: string;
    amount: number;
    payment_date?: string;
    payment_method?: 'cash' | 'card' | 'transfer' | 'other';
    reference_number?: string;
    notes?: string;
  }): Promise<PaymentRecord> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("غير مصرح");
    
    const { data, error } = await supabase
      .from("payment_records")
      .insert([{ ...paymentData, created_by: user.user.id }])
      .select()
      .single();
    
    if (error) throw error;
    return data as PaymentRecord;
  },

  async update(id: string, updates: Partial<{
    amount: number;
    payment_date: string;
    payment_method: 'cash' | 'card' | 'transfer' | 'other';
    reference_number: string;
    notes: string;
  }>): Promise<PaymentRecord> {
    const { data, error } = await supabase
      .from("payment_records")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data as PaymentRecord;
  },

  async delete(id: string): Promise<string> {
    const { error } = await supabase.from("payment_records").delete().eq("id", id);
    if (error) throw error;
    return id;
  },

  async bulkCreate(paymentRecords: {
    student_registration_id: string;
    amount: number;
    payment_date?: string;
    payment_method?: 'cash' | 'card' | 'transfer' | 'other';
    reference_number?: string;
    notes?: string;
  }[]): Promise<PaymentRecord[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("غير مصرح");
    
    const recordsWithUser = paymentRecords.map(record => ({
      ...record,
      created_by: user.user.id,
      payment_method: record.payment_method || 'cash' as const,
    }));
    
    const { data, error } = await supabase
      .from("payment_records")
      .insert(recordsWithUser)
      .select();
    
    if (error) throw error;
    return data as PaymentRecord[];
  }
};