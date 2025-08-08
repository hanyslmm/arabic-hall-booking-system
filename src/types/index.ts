import { Tables } from "@/integrations/supabase/types";

// Base types from database
export type Hall = Tables<"halls">;
export interface Teacher {
  id: string;
  name: string;
  mobile_phone?: string | null;
  subject_id?: string | null;
  created_at: string;
  subjects?: { name: string } | null;
  teacher_academic_stages?: Array<{ academic_stages: { name: string } }>;
  teacher_code?: string | null;
  default_class_fee?: number | null;
}
export type Subject = Tables<"subjects">;
export type AcademicStage = Tables<"academic_stages">;
export type WorkingHour = Tables<"working_hours">;
export type Booking = Tables<"bookings"> & {
  halls?: { name: string };
  teachers?: { name: string };
  academic_stages?: { name: string };
};
export type UserProfile = Tables<"profiles">;

// UI state types
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

// Navigation types
export interface NavigationItem {
  title: string;
  url: string;
  icon: any;
  description?: string;
}

export interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

// Form types
export interface TeacherFormData {
  name: string;
  mobile_phone?: string;
  subject_id?: string;
}

export interface HallFormData {
  name: string;
  capacity: number;
}

export interface BookingFormData {
  teacher_id: string;
  academic_stage_id: string;
  hall_id: string;
  number_of_students: number;
  start_time: string;
  start_date: string;
  end_date?: string;
  days_of_week: string[];
}

// Auth types
export interface AuthUser {
  id: string;
  email?: string;
}

export interface AuthPermissions {
  isOwner: boolean;
  isAdmin: boolean;
  isManager: boolean;
  canManageBookings: boolean;
  canManageData: boolean;
  canManageUsers: boolean;
}