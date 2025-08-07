
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
    const { username, password, user_role, full_name, email, phone } = await req.json();

    if (!username || !password || !user_role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: username, password, user_role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate user_role
    const validRoles = ['owner', 'manager', 'space_manager', 'read_only'];
    if (!validRoles.includes(user_role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid user_role. Must be one of: owner, manager, space_manager, read_only' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use provided email or generate one based on username
    const userEmail = email || `${username}@local.app`;

    // Create user using admin client
    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email: userEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username: username,
        full_name: full_name || username,
        phone: phone || null
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create user', details: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the user's profile with the specified user_role and additional info
    if (newUser.user) {
      const { error: profileUpdateError } = await supabaseClient
        .from('profiles')
        .update({ 
          user_role: user_role,
          full_name: full_name || username,
          email: userEmail,
          phone: phone || null,
          username: username
        })
        .eq('id', newUser.user.id);

      if (profileUpdateError) {
        console.error('Error updating profile:', profileUpdateError);
        // Try to insert if update failed (profile might not exist)
        const { error: insertError } = await supabaseClient
          .from('profiles')
          .insert({
            id: newUser.user.id,
            user_role: user_role,
            full_name: full_name || username,
            email: userEmail,
            phone: phone || null,
            username: username
          });
        
        if (insertError) {
          console.error('Error inserting profile:', insertError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: newUser.user?.id,
          email: userEmail,
          username: username,
          full_name: full_name || username,
          phone: phone || null,
          user_role: user_role
        }
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
