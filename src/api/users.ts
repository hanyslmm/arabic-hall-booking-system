import { supabase } from "@/integrations/supabase/client";

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  user_role: 'owner' | 'manager' | 'space_manager' | 'teacher';
created_at: string;
username?: string | null;
teacher_id?: string | null;
};

export type CreateUserData = {
  username: string;
  password: string;
  email?: string;
  full_name?: string;
  phone?: string;
  user_role: 'owner' | 'manager' | 'space_manager' | 'teacher';
};

export type UpdateUserData = {
  full_name?: string;
  phone?: string;
  email?: string;
  user_role?: 'owner' | 'manager' | 'space_manager' | 'teacher';
  password?: string;
};

export const getUsers = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
// Map profiles to UserProfile type - profiles table doesn't have phone field
return data.map((profile: any) => ({
  ...profile,
  phone: null
})) as UserProfile[];
};

export const createUser = async (userData: CreateUserData): Promise<UserProfile> => {
  // Create user with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: userData.email || `${userData.username}@local.app`,
    password: userData.password,
    user_metadata: {
      username: userData.username,
      full_name: userData.full_name || userData.username,
      phone: userData.phone,
      user_role: userData.user_role,
    },
  });

  if (authError) throw authError;

  // The profile should be created automatically via database trigger
  // Wait a moment and then fetch the profile
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .single();

  if (profileError) {
    // If profile doesn't exist, create it manually
    const { data: newProfile, error: createProfileError } = await supabase
      .from("profiles")
      .insert([{
        id: authData.user.id,
        email: userData.email || `${userData.username}@local.app`,
        full_name: userData.full_name || userData.username,
        phone: userData.phone,
        user_role: userData.user_role,
        username: userData.username,
      }])
      .select()
      .single();

    if (createProfileError) throw createProfileError;
    return { ...newProfile, phone: userData.phone || null } as UserProfile;
  }

  return { ...profile, phone: null } as UserProfile;
};

export const updateUser = async (userId: string, userData: UpdateUserData): Promise<UserProfile> => {
  const body: any = {
    userId,
    full_name: userData.full_name,
    phone: userData.phone,
    email: userData.email,
    user_role: userData.user_role,
  };
  if ((userData as any).teacher_id !== undefined) {
    body.teacher_id = (userData as any).teacher_id;
  }
  if (userData.password && userData.password.trim() !== '') {
    body.password = userData.password;
  }

  const response = await supabase.functions.invoke('update-user', { body });
  if (response.error) throw response.error;
  return response.data.user as UserProfile;
};

export const updateUserRole = async (userId: string, newRole: 'owner' | 'manager' | 'space_manager' | 'teacher') => {
  const response = await supabase.functions.invoke('update-user', {
    body: { userId, user_role: newRole }
  });
  if (response.error) throw response.error;
  return response.data.user as UserProfile;
};

export const deleteUser = async (userId: string) => {
  // Delete from auth (this should cascade to profiles)
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) throw authError;
  return userId;
};
