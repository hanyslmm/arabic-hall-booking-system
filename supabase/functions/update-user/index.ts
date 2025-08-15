
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

    const isActorOwner = profile?.user_role === 'owner';
    console.log('Actor info:', { actorUserId: user.id, actorRole: profile?.user_role });

    // Parse request body
    const requestBody = await req.json();
    console.log('Update user request:', requestBody);
    const { userId, password, user_role, full_name, email, phone, teacher_id } = requestBody;

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

    console.log('Target profile fetched:', { targetUserId: targetProfile.id, currentRole: targetProfile.user_role });

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

    // Role change guard: prevent demoting system admin to non-admin roles and restrict who can change roles
    if (user_role !== undefined) {
      if (!isActorOwner) {
        return new Response(
          JSON.stringify({ error: 'Only owners can change user roles' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (isSystemAdmin) {
        // Keep system admin as owner regardless of requested role
        profileUpdateData.user_role = 'owner';
      } else {
        // Allow changing to requested role (including space_manager)
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
    
    // Handle phone field - only add if it's provided and not empty
    if (phone !== undefined && phone !== null && phone.trim() !== '') {
      profileUpdateData.phone = phone;
    }

    if (Object.keys(profileUpdateData).length > 0) {
      console.log('Updating profile with data:', profileUpdateData);
      console.log('Calling admin_update_user_role with:', {
        target_user_id: userId,
        new_user_role: profileUpdateData.user_role || null,
        new_full_name: profileUpdateData.full_name || null,
        new_email: profileUpdateData.email || null,
        new_phone: profileUpdateData.phone || null,
        new_teacher_id: profileUpdateData.teacher_id || null
      });
      
      // Use the admin function that bypasses the trigger for authorized admin operations
      const { data: updatedProfile, error: profileUpdateError } = await supabaseClient
        .rpc('admin_update_user_role', {
          target_user_id: userId,
          new_user_role: profileUpdateData.user_role || null,
          new_full_name: profileUpdateData.full_name || null,
          new_email: profileUpdateData.email || null,
          new_phone: profileUpdateData.phone || null,
          new_teacher_id: profileUpdateData.teacher_id || null
        });

      if (profileUpdateError) {
        console.error('Error updating profile:', {
          message: profileUpdateError.message,
          code: (profileUpdateError as any).code,
          details: (profileUpdateError as any).details,
          hint: (profileUpdateError as any).hint
        });
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update user profile', 
            details: profileUpdateError.message,
            code: (profileUpdateError as any).code,
            db_details: (profileUpdateError as any).details,
            hint: (profileUpdateError as any).hint
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Profile updated successfully');
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
