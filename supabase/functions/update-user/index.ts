
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin (owner or manager)
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single();

    if (profileError || (profile?.user_role !== 'owner' && profile?.user_role !== 'manager')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId, password, user_role, full_name, email, phone, teacher_id } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate user_role if provided
    if (user_role) {
      const validRoles = ['owner', 'manager', 'space_manager', 'read_only', 'teacher'];
      if (!validRoles.includes(user_role)) {
        return new Response(
          JSON.stringify({ error: 'Invalid user_role. Must be one of: owner, manager, space_manager, read_only, teacher' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Guard: fetch target profile to protect system admin from demotion
    const { data: targetProfile, error: targetFetchError } = await supabaseClient
      .from('profiles')
      .select('id, email, role, user_role')
      .eq('id', userId)
      .single();

    if (targetFetchError || !targetProfile) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SYSTEM_ADMIN_ID = '00000000-0000-0000-0000-000000000001';
    const isSystemAdmin = targetProfile.id === SYSTEM_ADMIN_ID || (targetProfile.role as unknown as string) === 'ADMIN';

    // Update user using admin client (for password and email changes)
    const updateData: any = {};
    if (password && password.trim() !== '') {
      updateData.password = password;
    }
    if (email && email.trim() !== '') {
      updateData.email = email;
    }

    let updatedUser = null;
    if (Object.keys(updateData).length > 0) {
      const { data: authUser, error: updateError } = await supabaseClient.auth.admin.updateUserById(
        userId,
        updateData
      );

      if (updateError) {
        console.error('Error updating user:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update user', details: updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      updatedUser = authUser.user;
    }

    // Update the user's profile with all provided fields
    const profileUpdateData: any = {};

    // Role change guard: prevent demoting system admin to non-admin roles
    if (user_role !== undefined) {
      if (isSystemAdmin) {
        // Keep system admin as owner regardless of requested role
        profileUpdateData.user_role = 'owner';
      } else {
        // Prevent changing current owners/managers to teacher/read_only/space_manager unless explicitly allowed
        const isCurrentlyAdmin = targetProfile.user_role === 'owner' || targetProfile.user_role === 'manager';
        const isRequestedNonAdmin = user_role === 'teacher' || user_role === 'read_only' || user_role === 'space_manager';
        if (isCurrentlyAdmin && isRequestedNonAdmin) {
          return new Response(
            JSON.stringify({ error: 'Cannot demote admin users to non-admin roles' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        profileUpdateData.user_role = user_role;
      }
    }

    if (full_name !== undefined) profileUpdateData.full_name = full_name;
    if (email !== undefined) profileUpdateData.email = email;
    if (phone !== undefined) profileUpdateData.phone = phone;

    // Only allow teacher_id linkage for teacher role
    if (teacher_id !== undefined) {
      const effectiveRole = (profileUpdateData.user_role ?? targetProfile.user_role) as string | null;
      profileUpdateData.teacher_id = (effectiveRole === 'teacher') ? teacher_id : null;
    }

    if (Object.keys(profileUpdateData).length > 0) {
      const { error: profileUpdateError } = await supabaseClient
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', userId);

      if (profileUpdateError) {
        console.error('Error updating profile:', profileUpdateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update user profile', details: profileUpdateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get updated profile
    const { data: updatedProfile, error: fetchError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated profile:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch updated profile', details: fetchError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: updatedProfile
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
