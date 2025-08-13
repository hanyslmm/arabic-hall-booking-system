import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export function AdminDataDiagnostic() {
  const { user, profile, isAdmin, isOwner, isManager } = useAuth();
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnosticResults: DiagnosticResult[] = [];

    try {
      // Test 1: Authentication Status
      diagnosticResults.push({
        test: "Authentication Status",
        status: user ? 'success' : 'error',
        message: user ? `Authenticated as: ${user.email}` : 'Not authenticated',
        details: { userId: user?.id, email: user?.email }
      });

      // Test 2: Profile Data
      if (profile) {
        diagnosticResults.push({
          test: "Profile Data",
          status: 'success',
          message: `Profile loaded for ${profile.username || profile.email}`,
          details: {
            username: profile.username,
            user_role: profile.user_role,
            full_name: profile.full_name,
            email: profile.email
          }
        });
      } else {
        diagnosticResults.push({
          test: "Profile Data",
          status: 'error',
          message: 'Profile not found',
          details: null
        });
      }

      // Test 3: Admin Privileges
      diagnosticResults.push({
        test: "Admin Privileges",
        status: isAdmin ? 'success' : 'warning',
        message: isAdmin ? 'User has admin privileges' : 'User does NOT have admin privileges',
        details: {
          isOwner,
          isManager,
          isAdmin,
          user_role: profile?.user_role,
          expected_roles: ['owner', 'manager']
        }
      });

      // Test 4: Students Table Access
      const { data: students, error: studentsError, count: studentsCount } = await supabase
        .from("students")
        .select("*", { count: 'exact', head: false })
        .limit(5);

      diagnosticResults.push({
        test: "Students Table Access",
        status: studentsError ? 'error' : 'success',
        message: studentsError 
          ? `Error: ${studentsError.message}` 
          : `Found ${studentsCount || 0} students`,
        details: {
          error: studentsError,
          count: studentsCount,
          sample: students?.slice(0, 3)
        }
      });

      // Test 5: Teachers Table Access
      const { data: teachers, error: teachersError, count: teachersCount } = await supabase
        .from("teachers")
        .select("*", { count: 'exact', head: false })
        .limit(5);

      diagnosticResults.push({
        test: "Teachers Table Access",
        status: teachersError ? 'error' : 'success',
        message: teachersError 
          ? `Error: ${teachersError.message}` 
          : `Found ${teachersCount || 0} teachers`,
        details: {
          error: teachersError,
          count: teachersCount,
          sample: teachers?.slice(0, 3)
        }
      });

      // Test 6: Bookings Table Access
      const { data: bookings, error: bookingsError, count: bookingsCount } = await supabase
        .from("bookings")
        .select("*", { count: 'exact', head: false })
        .limit(5);

      diagnosticResults.push({
        test: "Bookings Table Access",
        status: bookingsError ? 'error' : 'success',
        message: bookingsError 
          ? `Error: ${bookingsError.message}` 
          : `Found ${bookingsCount || 0} bookings`,
        details: {
          error: bookingsError,
          count: bookingsCount,
          sample: bookings?.slice(0, 3)
        }
      });

      // Test 7: Halls Table Access
      const { data: halls, error: hallsError, count: hallsCount } = await supabase
        .from("halls")
        .select("*", { count: 'exact', head: false });

      diagnosticResults.push({
        test: "Halls Table Access",
        status: hallsError ? 'error' : 'success',
        message: hallsError 
          ? `Error: ${hallsError.message}` 
          : `Found ${hallsCount || 0} halls`,
        details: {
          error: hallsError,
          count: hallsCount,
          halls: halls
        }
      });

      // Test 8: RLS Policy Check
      try {
        const { data: isAdminUser, error: rlsError } = await supabase.rpc('is_admin_user');
        diagnosticResults.push({
          test: "RLS Admin Check",
          status: rlsError ? 'error' : (isAdminUser ? 'success' : 'warning'),
          message: rlsError 
            ? `Error: ${rlsError.message}` 
            : `is_admin_user() returned: ${isAdminUser}`,
          details: { isAdminUser, error: rlsError }
        });
      } catch (e) {
        diagnosticResults.push({
          test: "RLS Admin Check",
          status: 'error',
          message: 'Function not found or error calling is_admin_user()',
          details: { error: e }
        });
      }

      // Test 9: Check if database is empty
      const hasData = (studentsCount || 0) > 0 || (teachersCount || 0) > 0 || 
                     (bookingsCount || 0) > 0 || (hallsCount || 0) > 0;
      
      diagnosticResults.push({
        test: "Database Content",
        status: hasData ? 'success' : 'warning',
        message: hasData 
          ? 'Database contains data' 
          : 'Database appears to be empty - you may need to add initial data',
        details: {
          students: studentsCount || 0,
          teachers: teachersCount || 0,
          bookings: bookingsCount || 0,
          halls: hallsCount || 0
        }
      });

    } catch (error) {
      diagnosticResults.push({
        test: "Unexpected Error",
        status: 'error',
        message: `An unexpected error occurred: ${error}`,
        details: { error }
      });
    }

    setResults(diagnosticResults);
    setIsRunning(false);
  };

  useEffect(() => {
    // Auto-run diagnostics on mount
    runDiagnostics();
  }, []);

  const getIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getSummary = () => {
    const errors = results.filter(r => r.status === 'error').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const successes = results.filter(r => r.status === 'success').length;

    if (errors > 0) {
      return {
        status: 'error',
        message: `Found ${errors} error(s) that need to be fixed`,
        solution: profile?.user_role !== 'owner' && profile?.user_role !== 'manager'
          ? "Your user account needs to be upgraded to 'owner' or 'manager' role in the database"
          : "Check the error details below for specific issues"
      };
    } else if (warnings > 0) {
      return {
        status: 'warning',
        message: `Found ${warnings} warning(s)`,
        solution: "Review the warnings below. The system may work but with limited functionality."
      };
    } else {
      return {
        status: 'success',
        message: "All diagnostics passed successfully!",
        solution: null
      };
    }
  };

  const summary = getSummary();

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Admin Data Access Diagnostic</span>
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            size="sm"
          >
            {isRunning ? 'Running...' : 'Re-run Diagnostics'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className={`p-4 rounded-lg border ${
          summary.status === 'error' ? 'bg-red-50 border-red-200' :
          summary.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
          'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-start space-x-2">
            {getIcon(summary.status)}
            <div>
              <p className="font-semibold">{summary.message}</p>
              {summary.solution && (
                <p className="text-sm mt-1 text-gray-600">{summary.solution}</p>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="space-y-2">
          {results.map((result, index) => (
            <div key={index} className="border rounded-lg p-3">
              <div className="flex items-start space-x-2">
                {getIcon(result.status)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{result.test}</p>
                    <span className={`text-sm px-2 py-1 rounded ${
                      result.status === 'success' ? 'bg-green-100 text-green-700' :
                      result.status === 'error' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-sm text-gray-500 cursor-pointer">View Details</summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Fix SQL */}
        {profile && profile.user_role !== 'owner' && profile.user_role !== 'manager' && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="font-semibold text-blue-900 mb-2">Quick Fix SQL Command:</p>
            <p className="text-sm text-blue-800 mb-2">
              Run this SQL command in your Supabase SQL Editor to grant admin privileges:
            </p>
            <pre className="bg-white p-3 rounded border border-blue-300 text-sm overflow-auto">
{`UPDATE profiles 
SET user_role = 'owner' 
WHERE id = '${user?.id}';`}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}