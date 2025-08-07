import { supabase } from "@/integrations/supabase/client";

export const debugCurrentUser = async () => {
  try {
    console.log("=== Current User Debug Info ===");
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Session error:", sessionError);
      return;
    }
    
    console.log("Current session user:", {
      id: session?.user?.id,
      email: session?.user?.email,
      aud: session?.user?.aud
    });
    
    if (!session?.user) {
      console.log("No user logged in");
      return;
    }
    
    // Get current user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) {
      console.error("Profile error:", profileError);
      
      // Try to create profile if it doesn't exist
      if (profileError.code === 'PGRST116') {
        console.log("Creating missing profile...");
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || 'User',
            user_role: session.user.email === 'hanyslmm@gmail.com' ? 'owner' : 'space_manager',
            role: session.user.email === 'hanyslmm@gmail.com' ? 'ADMIN' : 'USER'
          })
          .select()
          .single();
        
        if (createError) {
          console.error("Error creating profile:", createError);
        } else {
          console.log("Created profile:", newProfile);
        }
      }
    } else {
      console.log("Current profile:", profile);
    }
    
    // Test permissions by trying to fetch teachers
    const { data: teachers, error: teachersError } = await supabase
      .from('teachers')
      .select('*')
      .limit(1);
    
    if (teachersError) {
      console.error("Teachers fetch error:", teachersError);
    } else {
      console.log("Can fetch teachers:", teachers?.length || 0, "records");
    }
    
    // Test permissions by trying to fetch halls
    const { data: halls, error: hallsError } = await supabase
      .from('halls')
      .select('*')
      .limit(1);
    
    if (hallsError) {
      console.error("Halls fetch error:", hallsError);
    } else {
      console.log("Can fetch halls:", halls?.length || 0, "records");
    }
    
    // Check if we can insert a test teacher (we'll delete it right after)
    const { data: testTeacher, error: insertError } = await supabase
      .from('teachers')
      .insert({
        name: 'Test Teacher - DELETE ME'
      })
      .select()
      .single();
    
    if (insertError) {
      console.error("Cannot insert teacher:", insertError);
    } else {
      console.log("Can insert teacher - test successful");
      
      // Delete the test teacher
      await supabase
        .from('teachers')
        .delete()
        .eq('id', testTeacher.id);
      console.log("Deleted test teacher");
    }
    
  } catch (error) {
    console.error("Debug script error:", error);
  }
};

// Auto-run when imported
if (typeof window !== 'undefined') {
  debugCurrentUser();
}
