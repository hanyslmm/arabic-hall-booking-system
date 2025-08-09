import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type Booking = Tables<"bookings"> & {
  halls?: { name: string };
  teachers?: { name: string };
  academic_stages?: { name: string };
};

export const getBookings = async (): Promise<Booking[]> => {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      halls(name),
      teachers(name),
      academic_stages(name)
    `)
    .order("start_date", { ascending: false });
  if (error) throw error;
  return data as Booking[];
};

export const addBooking = async (booking: Omit<Tables<"bookings">, "id" | "created_at" | "updated_at" | "created_by">) => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("غير مصرح");
  const { data, error } = await supabase
    .from("bookings")
    .insert([{ ...booking, created_by: user.user.id }])
    .select()
    .single();
  if (error) throw error;
  return data as Booking;
};

export const updateBooking = async (id: string, updates: Partial<Tables<"bookings">>) => {
  const { data, error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Booking;
};

export const setCustomFeeForBooking = async (id: string, classFees: number) => {
  // Prefer atomic RPC that updates booking and registrations together
  try {
    const { error: rpcError } = await supabase.rpc('set_booking_custom_fee', { p_booking_id: id, p_fee: classFees });
    if (rpcError) throw rpcError;
  } catch (_) {
    // Fallback to previous behavior: update booking then propagate
    const { data, error } = await supabase
      .from('bookings')
      .update({ class_fees: classFees, is_custom_fee: true })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    try {
      const { error: rpcError2 } = await supabase.rpc('apply_booking_fee', { p_booking_id: id });
      if (rpcError2) throw rpcError2;
    } catch (_) {
      const { data: regs, error: regsError } = await supabase
        .from('student_registrations')
        .select('id, paid_amount')
        .eq('booking_id', id);
      if (regsError) throw regsError;

      const registrations = (regs as Array<{ id: string; paid_amount: number | null }>) || [];
      for (const reg of registrations) {
        const paidAmount = Number(reg.paid_amount || 0);
        const newStatus = paidAmount === 0 ? 'pending' : (paidAmount >= classFees ? 'paid' : 'partial');
        const { error: updErr } = await supabase
          .from('student_registrations')
          .update({ total_fees: classFees, payment_status: newStatus })
          .eq('id', reg.id);
        if (updErr) throw updErr;
      }
    }
  }

  // Fetch and return updated booking snapshot
  const { data: updatedBooking, error: fetchErr } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchErr) throw fetchErr;
  return updatedBooking as Booking;
};

export const applyBookingFeeToRegistrations = async (id: string) => {
  // Prefer RPC for atomic update; fallback to manual if unavailable
  try {
    const { error } = await supabase.rpc('apply_booking_fee', { p_booking_id: id });
    if (error) throw error;
  } catch (_) {
    // Fetch current class fee
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('class_fees')
      .eq('id', id)
      .single();
    if (bookingErr) throw bookingErr;
    const classFees = Number(booking?.class_fees || 0);

    const { data: regs, error: regsError } = await supabase
      .from('student_registrations')
      .select('id, paid_amount')
      .eq('booking_id', id);
    if (regsError) throw regsError;

    const registrations = (regs as Array<{ id: string; paid_amount: number | null }>) || [];
    for (const reg of registrations) {
      const paidAmount = Number(reg.paid_amount || 0);
      const newStatus = paidAmount === 0 ? 'pending' : (paidAmount >= classFees ? 'paid' : 'partial');
      const { error: updErr } = await supabase
        .from('student_registrations')
        .update({ total_fees: classFees, payment_status: newStatus })
        .eq('id', reg.id);
      if (updErr) throw updErr;
    }
  }
};

export const deleteBooking = async (id: string) => {
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw error;
  return id;
};

export const getBookingsByDate = async (startDate: string): Promise<Booking[]> => {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      halls(name),
      teachers(name),
      academic_stages(name)
    `)
    .eq("start_date", startDate)
    .order("start_time");
  if (error) throw error;
  return data as Booking[];
};

export const getBookingById = async (id: string): Promise<Booking> => {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      halls(name),
      teachers(name),
      academic_stages(name)
    `)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Booking;
};

// Export as bookingsApi object
export const bookingsApi = {
  getAll: getBookings,
  getById: getBookingById,
  getByDate: getBookingsByDate,
  create: addBooking,
  update: updateBooking,
  delete: deleteBooking,
  setCustomFeeForBooking,
  applyBookingFeeToRegistrations,
};