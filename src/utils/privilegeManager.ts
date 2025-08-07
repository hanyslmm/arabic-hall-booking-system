import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'owner' | 'manager' | 'space_manager' | 'read_only';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  user_role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface PrivilegeResult {
  success: boolean;
  message: string;
  user_id?: string;
}

/**
 * Check if the current user has admin privileges
 */
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return false;

    const { data, error } = await supabase
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single();

    if (error) return false;

    return data.user_role === 'owner' || data.user_role === 'manager';
  } catch (error) {
    console.error('Error checking admin privileges:', error);
    return false;
  }
};

/**
 * Get user profile by email
 */
export const getUserProfile = async (email: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

/**
 * Get all user profiles (admin only)
 */
export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all users:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
};

/**
 * Grant admin privileges to a user using direct database update
 */
export const grantAdminPrivileges = async (email: string): Promise<PrivilegeResult> => {
  try {
    // First check if user exists
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError) {
      return {
        success: false,
        message: `User not found: ${userError.message}`
      };
    }

    // Update user privileges
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        user_role: 'owner',
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id);

    if (updateError) {
      console.error('Error granting admin privileges:', updateError);
      return {
        success: false,
        message: `Failed to grant admin privileges: ${updateError.message}`
      };
    }

    return {
      success: true,
      message: `User ${email} has been granted admin privileges`,
      user_id: userData.id
    };
  } catch (error) {
    console.error('Error granting admin privileges:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Grant read-only privileges to a user using direct database update
 */
export const grantReadOnlyPrivileges = async (email: string): Promise<PrivilegeResult> => {
  try {
    // First check if user exists
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError) {
      return {
        success: false,
        message: `User not found: ${userError.message}`
      };
    }

    // Update user privileges
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        user_role: 'read_only' as any, // Cast to bypass TypeScript type restriction
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id);

    if (updateError) {
      console.error('Error granting read-only privileges:', updateError);
      return {
        success: false,
        message: `Failed to grant read-only privileges: ${updateError.message}`
      };
    }

    return {
      success: true,
      message: `User ${email} has been granted read-only privileges`,
      user_id: userData.id
    };
  } catch (error) {
    console.error('Error granting read-only privileges:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Upgrade multiple users to admin (batch operation)
 */
export const upgradeMultipleUsersToAdmin = async (emails: string[]): Promise<Array<{email: string} & PrivilegeResult>> => {
  const results = [];
  
  for (const email of emails) {
    const result = await grantAdminPrivileges(email);
    results.push({ email, ...result });
  }
  
  return results;
};

/**
 * Create or update user profile with admin privileges
 */
export const createAdminUser = async (email: string, fullName?: string): Promise<PrivilegeResult> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        message: 'User not authenticated'
      };
    }

    // Upsert the profile with admin privileges
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: email,
        full_name: fullName || email.split('@')[0],
        user_role: 'owner' as any, // Cast to bypass TypeScript type restriction
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating admin user:', error);
      return {
        success: false,
        message: `Failed to create admin user: ${error.message}`
      };
    }

    return {
      success: true,
      message: `Admin user ${email} created successfully`,
      user_id: data.id
    };
  } catch (error) {
    console.error('Error creating admin user:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Create a new admin user account with full privileges
 */
export const createNewAdminUser = async (email: string, password: string, fullName: string): Promise<PrivilegeResult> => {
  try {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return {
        success: false,
        message: `Failed to create auth user: ${authError.message}`
      };
    }

    if (!authData.user) {
      return {
        success: false,
        message: 'Failed to create user - no user returned'
      };
    }

    // Create profile with admin privileges
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        full_name: fullName,
        user_role: 'owner'
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return {
        success: false,
        message: `Failed to create profile: ${profileError.message}`
      };
    }

    return {
      success: true,
      message: `Admin user ${email} created successfully`,
      user_id: authData.user.id
    };
  } catch (error) {
    console.error('Error creating admin user:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Upgrade all existing users to admin privileges (migration helper)
 */
export const upgradeAllExistingUsers = async (): Promise<Array<{email: string} & PrivilegeResult>> => {
  try {
    // Get all users
    const users = await getAllUsers();
    
    // Upgrade each user to admin
    const results = [];
    for (const user of users) {
      const result = await grantAdminPrivileges(user.email);
      results.push({ email: user.email, ...result });
    }

    return results;
  } catch (error) {
    console.error('Error upgrading all users:', error);
    return [{
      email: 'ALL_USERS',
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }];
  }
};

/**
 * Get role display name in Arabic
 */
export const getRoleDisplayName = (userRole: UserRole): string => {
  if (userRole === 'owner') {
    return 'مدير النظام';
  }
  if (userRole === 'manager') {
    return 'مدير';
  }
  if (userRole === 'space_manager') {
    return 'مدير المساحة';
  }
  if (userRole === 'read_only') {
    return 'قراءة فقط';
  }
  return 'مستخدم';
};

/**
 * Check if user can perform admin actions
 */
export const canPerformAdminActions = (userRole: UserRole): boolean => {
  return userRole === 'owner' || userRole === 'manager';
};

/**
 * Check if user can only read
 */
export const isReadOnlyUser = (userRole: UserRole): boolean => {
  return userRole === 'read_only';
};

// Legacy functions for backward compatibility
export async function upgradeUserToOwner(email: string) {
  const result = await grantAdminPrivileges(email);
  return { 
    success: result.success, 
    error: result.success ? null : result.message,
    profile: result.success ? { email } : null
  };
}

export async function checkUserPrivileges(email: string) {
  const profile = await getUserProfile(email);
  return {
    success: profile !== null,
    error: profile === null ? 'User not found' : null,
    profile
  };
}

export async function upgradeAdminUsers() {
  const adminEmails = ['admin@admin.com', 'hanyslmm@gmail.com'];
  const results = await upgradeMultipleUsersToAdmin(adminEmails);
  
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ Successfully upgraded ${result.email} to admin`);
    } else {
      console.log(`❌ Failed to upgrade ${result.email}: ${result.message}`);
    }
  });
}