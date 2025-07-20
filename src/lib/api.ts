import { supabase } from "@/integrations/supabase/client";

// Generic API utilities
export class ApiError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: unknown, context: string): never => {
  console.error(`Error in ${context}:`, error);
  throw new ApiError(`فشل في ${context}`, error);
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw new ApiError("فشل في الحصول على بيانات المستخدم", error);
  if (!user) throw new ApiError("غير مصرح");
  return user;
};

// Generic CRUD operations
export const createRecord = async <T extends Record<string, unknown>>(
  table: string,
  data: T,
  includeCreatedBy: boolean = false
) => {
  try {
    let recordData = data;
    
    if (includeCreatedBy) {
      const user = await getCurrentUser();
      recordData = { ...data, created_by: user.id };
    }

    const { data: result, error } = await supabase
      .from(table)
      .insert([recordData])
      .select()
      .single();

    if (error) throw error;
    return result as T;
  } catch (error) {
    handleApiError(error, `إنشاء ${table}`);
  }
};

export const updateRecord = async <T>(
  table: string,
  id: string,
  updates: Partial<T>
) => {
  try {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as T;
  } catch (error) {
    handleApiError(error, `تحديث ${table}`);
  }
};

export const deleteRecord = async (table: string, id: string) => {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return id;
  } catch (error) {
    handleApiError(error, `حذف ${table}`);
  }
};

export const fetchRecords = async <T>(
  table: string,
  select: string = '*',
  orderBy?: string,
  filters?: Record<string, unknown>
) => {
  try {
    let query = supabase.from(table).select(select);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    if (orderBy) {
      query = query.order(orderBy);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as T[];
  } catch (error) {
    handleApiError(error, `جلب ${table}`);
  }
};