// Simple debug component to check user authentication and permissions
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const SimpleDebugger = () => {
  const { user, profile, loading, isAdmin, isOwner, canManageUsers } = useAuth();
  const [testResults, setTestResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    const results: any = {
      auth: {},
      permissions: {},
      database: {}
    };

    try {
      // Test 1: Authentication status
      results.auth = {
        user: user ? {
          id: user.id,
          email: user.email
        } : null,
        profile: profile,
        isAdmin,
        isOwner,
        canManageUsers
      };

      // Test 2: Database permissions
      try {
        const { data: teachers, error: teachersError } = await supabase
          .from('teachers')
          .select('*')
          .limit(1);
        
        results.database.teachers = {
          canRead: !teachersError,
          error: teachersError?.message,
          count: teachers?.length || 0
        };
      } catch (error: any) {
        results.database.teachers = {
          canRead: false,
          error: error.message
        };
      }

      try {
        const { data: halls, error: hallsError } = await supabase
          .from('halls')
          .select('*')
          .limit(1);
        
        results.database.halls = {
          canRead: !hallsError,
          error: hallsError?.message,
          count: halls?.length || 0
        };
      } catch (error: any) {
        results.database.halls = {
          canRead: false,
          error: error.message
        };
      }

      // Test 3: Try creating a test teacher
      try {
        const { data: testTeacher, error: createError } = await supabase
          .from('teachers')
          .insert({
            name: 'Debug Test Teacher'
          })
          .select()
          .single();

        if (createError) {
          results.database.canCreate = false;
          results.database.createError = createError.message;
        } else {
          results.database.canCreate = true;
          // Clean up - delete the test teacher
          await supabase
            .from('teachers')
            .delete()
            .eq('id', testTeacher.id);
        }
      } catch (error: any) {
        results.database.canCreate = false;
        results.database.createError = error.message;
      }

      setTestResults(results);
    } catch (error: any) {
      setTestResults({ error: error.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div>Loading user data...</div>;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto m-4">
      <CardHeader>
        <CardTitle>Authentication & Database Debug Panel</CardTitle>
        <CardDescription>
          Debug current user authentication and database permissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runTests} disabled={testing}>
          {testing ? "Running Tests..." : "Run Debug Tests"}
        </Button>

        {testResults && (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Authentication Status</h3>
              <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(testResults.auth, null, 2)}
              </pre>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Database Permissions</h3>
              <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(testResults.database, null, 2)}
              </pre>
            </div>

            {testResults.error && (
              <div className="p-4 border rounded-lg border-red-500">
                <h3 className="font-semibold mb-2 text-red-600">Error</h3>
                <p className="text-red-600">{testResults.error}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
