export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      academic_stages: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_stages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_date: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          status: string
          student_registration_id: string
        }
        Insert: {
          attendance_date: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          status: string
          student_registration_id: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string
          student_registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_student_registration_id_fkey"
            columns: ["student_registration_id"]
            isOneToOne: false
            referencedRelation: "student_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          academic_stage_id: string
          class_code: string | null
          class_fees: number | null
          created_at: string | null
          created_by: string
          days_of_week: string[]
          end_date: string | null
          hall_id: string
          id: string
          is_custom_fee: boolean | null
          number_of_students: number
          start_date: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"] | null
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          academic_stage_id: string
          class_code?: string | null
          class_fees?: number | null
          created_at?: string | null
          created_by: string
          days_of_week: string[]
          end_date?: string | null
          hall_id: string
          id?: string
          is_custom_fee?: boolean | null
          number_of_students: number
          start_date: string
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          academic_stage_id?: string
          class_code?: string | null
          class_fees?: number | null
          created_at?: string | null
          created_by?: string
          days_of_week?: string[]
          end_date?: string | null
          hall_id?: string
          id?: string
          is_custom_fee?: boolean | null
          number_of_students?: number
          start_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_academic_stage_id_fkey"
            columns: ["academic_stage_id"]
            isOneToOne: false
            referencedRelation: "academic_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_hall_id_fkey"
            columns: ["hall_id"]
            isOneToOne: false
            referencedRelation: "halls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      halls: {
        Row: {
          capacity: number
          created_at: string | null
          id: string
          name: string
          operating_end_time: string | null
          operating_start_time: string | null
          updated_at: string | null
        }
        Insert: {
          capacity: number
          created_at?: string | null
          id?: string
          name: string
          operating_end_time?: string | null
          operating_start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string | null
          id?: string
          name?: string
          operating_end_time?: string | null
          operating_start_time?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_records: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          reference_number: string | null
          student_registration_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference_number?: string | null
          student_registration_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference_number?: string | null
          student_registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_student_registration_id_fkey"
            columns: ["student_registration_id"]
            isOneToOne: false
            referencedRelation: "student_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          teacher_id: string | null
          updated_at: string
          user_role: Database["public"]["Enums"]["user_role"] | null
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          teacher_id?: string | null
          updated_at?: string
          user_role?: Database["public"]["Enums"]["user_role"] | null
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          teacher_id?: string | null
          updated_at?: string
          user_role?: Database["public"]["Enums"]["user_role"] | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string | null
          id: number
          key: string
          value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          key: string
          value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          key?: string
          value?: string | null
        }
        Relationships: []
      }
      student_registrations: {
        Row: {
          booking_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          paid_amount: number | null
          payment_status: string
          registration_date: string
          student_id: string
          total_fees: number | null
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          payment_status?: string
          registration_date?: string
          student_id: string
          total_fees?: number | null
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          payment_status?: string
          registration_date?: string
          student_id?: string
          total_fees?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_registrations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          city: string | null
          created_at: string
          created_by: string | null
          id: string
          mobile_phone: string
          name: string
          parent_phone: string | null
          serial_number: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mobile_phone: string
          name: string
          parent_phone?: string | null
          serial_number: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mobile_phone?: string
          name?: string
          parent_phone?: string | null
          serial_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_academic_stages: {
        Row: {
          academic_stage_id: string
          created_at: string
          id: string
          teacher_id: string
        }
        Insert: {
          academic_stage_id: string
          created_at?: string
          id?: string
          teacher_id: string
        }
        Update: {
          academic_stage_id?: string
          created_at?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_academic_stages_academic_stage_id_fkey"
            columns: ["academic_stage_id"]
            isOneToOne: false
            referencedRelation: "academic_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_academic_stages_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string | null
          created_by: string | null
          default_class_fee: number | null
          id: string
          mobile_phone: string | null
          name: string
          subject_id: string | null
          teacher_code: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          default_class_fee?: number | null
          id?: string
          mobile_phone?: string | null
          name: string
          subject_id?: string | null
          teacher_code?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          default_class_fee?: number | null
          id?: string
          mobile_phone?: string | null
          name?: string
          subject_id?: string | null
          teacher_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          staff_owner: string | null
          sub_category: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          staff_owner?: string | null
          sub_category?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          staff_owner?: string | null
          sub_category?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      working_hours: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          hall_id: string
          id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          hall_id: string
          id?: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          hall_id?: string
          id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "working_hours_hall_id_fkey"
            columns: ["hall_id"]
            isOneToOne: false
            referencedRelation: "halls"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_update_user_role: {
        Args: {
          new_email?: string
          new_full_name?: string
          new_phone?: string
          new_teacher_id?: string
          new_user_role: Database["public"]["Enums"]["user_role"]
          target_user_id: string
        }
        Returns: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          teacher_id: string | null
          updated_at: string
          user_role: Database["public"]["Enums"]["user_role"] | null
          username: string | null
        }
      }
      apply_booking_fee: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      apply_teacher_default_fee: {
        Args: { p_fee: number; p_teacher_id: string }
        Returns: undefined
      }
      can_manage_operations: {
        Args: { user_id: string }
        Returns: boolean
      }
      check_booking_conflict: {
        Args: {
          p_booking_id?: string
          p_days_of_week: string[]
          p_end_date?: string
          p_hall_id: string
          p_start_date: string
          p_start_time: string
        }
        Returns: boolean
      }
      check_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_user_admin_status: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      copy_default_categories_for_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      generate_class_code: {
        Args: {
          p_days_of_week: string[]
          p_start_time: string
          p_teacher_id: string
        }
        Returns: string
      }
      generate_student_serial: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_financial_summary: {
        Args: { p_month: string }
        Returns: {
          occupancy_rate: number
          total_expenses: number
          total_income: number
        }[]
      }
      get_hall_actual_occupancy: {
        Args: Record<PropertyKey, never>
        Returns: {
          capacity: number
          hall_id: string
          hall_name: string
          occupancy_percentage: number
          registered_students: number
        }[]
      }
      get_hall_actual_occupancy_updated: {
        Args: Record<PropertyKey, never>
        Returns: {
          capacity: number
          hall_id: string
          hall_name: string
          occupancy_percentage: number
          registered_students: number
        }[]
      }
      get_hall_occupancy_rates: {
        Args: Record<PropertyKey, never>
        Returns: {
          hall_id: string
          name: string
          occupancy_percentage: number
        }[]
      }
      get_hall_time_slot_occupancy: {
        Args: Record<PropertyKey, never>
        Returns: {
          available_slots: number
          hall_id: string
          hall_name: string
          occupancy_percentage: number
          occupied_slots: number
          working_days_per_week: number
          working_hours_per_day: number
        }[]
      }
      get_payments_sum: {
        Args: { end_date: string; start_date: string }
        Returns: number
      }
      get_teacher_statistics: {
        Args: { p_teacher_id: string }
        Returns: {
          attendance_rate: number
          monthly_earnings: number
          pending_payments: number
          total_classes: number
          total_earnings: number
          total_students: number
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_super_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      search_student: {
        Args: { search_term: string }
        Returns: {
          city: string
          created_at: string
          id: string
          mobile_phone: string
          name: string
          parent_phone: string
          serial_number: string
        }[]
      }
      set_booking_custom_fee: {
        Args: { p_booking_id: string; p_fee: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "USER" | "ADMIN"
      booking_status: "active" | "cancelled" | "completed"
      user_role: "owner" | "manager" | "space_manager" | "teacher"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["USER", "ADMIN"],
      booking_status: ["active", "cancelled", "completed"],
      user_role: ["owner", "manager", "space_manager", "teacher"],
    },
  },
} as const
