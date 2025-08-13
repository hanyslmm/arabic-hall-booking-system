import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Database, 
  Shield, 
  Users, 
  Settings,
  Eye,
  EyeOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
  fix?: () => Promise<void>;
}

export const AdminDataDiagnostic = () => {
  const { user, profile, isAdmin, isOwner } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Test database connection and permissions
  const testDatabaseAccess = async (): Promise<DiagnosticResult[]> => {
    const results: DiagnosticResult[] = [];

    try {
      // Test 1: Basic connection
      const { data: connectionTest, error: connectionError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (connectionError) {
        results.push({
          name: "Database Connection",
          status: 'error',
          message: `Connection failed: ${connectionError.message}`,
          details: connectionError
        });
      } else {
        results.push({
          name: "Database Connection",
          status: 'success',
          message: "Database connection successful"
        });
      }

      // Test 2: Authentication state
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        results.push({
          name: "Authentication",
          status: 'error',
          message: `Authentication error: ${sessionError.message}`,
          details: sessionError
        });
      } else if (!session?.user) {
        results.push({
          name: "Authentication",
          status: 'warning',
          message: "No authenticated user found"
        });
      } else {
        results.push({
          name: "Authentication",
          status: 'success',
          message: `Authenticated as: ${session.user.email}`
        });
      }

      // Test 3: User profile
      if (session?.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          results.push({
            name: "User Profile",
            status: 'error',
            message: `Profile error: ${profileError.message}`,
            details: profileError
          });
        } else {
          results.push({
            name: "User Profile",
            status: 'success',
            message: `Profile loaded: ${profileData.user_role} role`,
            details: profileData
          });
        }
      }

      // Test 4: Admin permissions
      if (session?.user) {
        // Try the new function first, then fall back to the legacy one
        let adminCheckFunctionUsed = 'check_user_admin_status';
        let adminResult: boolean | null = null;
        let primaryError: any = null;
        let fallbackError: any = null;

        const { data: adminTestV2, error: adminErrorV2 } = await supabase.rpc('check_user_admin_status');
        if (adminErrorV2) {
          primaryError = adminErrorV2;
          adminCheckFunctionUsed = 'is_admin_user';
          const { data: adminTestLegacy, error: adminErrorLegacy } = await supabase.rpc('is_admin_user');
          if (adminErrorLegacy) {
            fallbackError = adminErrorLegacy;
          } else {
            adminResult = Boolean(adminTestLegacy);
          }
        } else {
          adminResult = Boolean(adminTestV2);
        }

        if (adminResult === null) {
          results.push({
            name: "Admin Permissions",
            status: 'error',
            message: `Admin check failed: ${primaryError?.message || 'Unknown error'}`,
            details: { primaryError, fallbackError }
          });
        } else {
          results.push({
            name: "Admin Permissions",
            status: adminResult ? 'success' : 'warning',
            message: adminResult ? "Admin permissions confirmed" : "User does not have admin permissions",
            details: { isAdmin: adminResult, function: adminCheckFunctionUsed }
          });
        }
      }

      // Test 5: Data access tests
      const tables = ['bookings', 'students', 'teachers', 'halls', 'subjects'];
      
      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('count')
            .limit(1);

          if (error) {
            results.push({
              name: `${table} Access`,
              status: 'error',
              message: `Cannot access ${table}: ${error.message}`,
              details: error
            });
          } else {
            results.push({
              name: `${table} Access`,
              status: 'success',
              message: `Can access ${table} table`
            });
          }
        } catch (err) {
          results.push({
            name: `${table} Access`,
            status: 'error',
            message: `Exception accessing ${table}: ${err}`,
            details: err
          });
        }
      }

    } catch (error) {
      results.push({
        name: "General Error",
        status: 'error',
        message: `Unexpected error: ${error}`,
        details: error
      });
    }

    return results;
  };

  // Test UI elements for duplicates and border issues
  const testUIElements = (): DiagnosticResult[] => {
    const results: DiagnosticResult[] = [];

    // Check for duplicate notification bells
    const notificationBells = document.querySelectorAll('[data-testid="notification-bell"], .notification-bell');
    if (notificationBells.length > 1) {
      results.push({
        name: "Duplicate Notification Bells",
        status: 'warning',
        message: `Found ${notificationBells.length} notification bell elements`,
        details: { count: notificationBells.length }
      });
    } else {
      results.push({
        name: "Notification Bells",
        status: 'success',
        message: "No duplicate notification bells found"
      });
    }

    // Check for border inconsistencies
    const cards = document.querySelectorAll('.card, [class*="border"]');
    let borderIssues = 0;
    
    cards.forEach((card, index) => {
      const computedStyle = window.getComputedStyle(card);
      const borderRadius = computedStyle.borderRadius;
      const borderWidth = computedStyle.borderWidth;
      
      if (borderRadius === '0px' && borderWidth !== '0px') {
        borderIssues++;
      }
    });

    if (borderIssues > 0) {
      results.push({
        name: "Border Consistency",
        status: 'warning',
        message: `Found ${borderIssues} elements with potential border issues`,
        details: { borderIssues }
      });
    } else {
      results.push({
        name: "Border Consistency",
        status: 'success',
        message: "All borders appear consistent"
      });
    }

    return results;
  };

  // Auto-fix admin role
  const fixAdminRole = async (): Promise<void> => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ user_role: 'owner' })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Admin Role Fixed",
        description: "Your admin privileges have been restored.",
        variant: "success"
      });

      // Refresh the page to update auth state
      window.location.reload();
    } catch (error) {
      toast({
        title: "Fix Failed",
        description: `Failed to fix admin role: ${error}`,
        variant: "destructive"
      });
    }
  };

  // Run all diagnostics
  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const dbResults = await testDatabaseAccess();
      const uiResults = testUIElements();
      setResults([...dbResults, ...uiResults]);
    } catch (error) {
      setResults([{
        name: "Diagnostic Error",
        status: 'error',
        message: `Failed to run diagnostics: ${error}`,
        details: error
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          System Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={isAdmin ? "default" : "secondary"}>
              {isAdmin ? "Admin" : "User"}
            </Badge>
            <Badge variant="outline">
              {profile?.user_role || "Unknown"}
            </Badge>
          </div>
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Separator />

        <div className="space-y-3">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-3 border rounded-lg ${getStatusColor(result.status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.status)}
                  <div>
                    <h4 className="font-medium">{result.name}</h4>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  </div>
                </div>
                {result.fix && (
                  <Button
                    onClick={result.fix}
                    size="sm"
                    variant="outline"
                  >
                    Fix
                  </Button>
                )}
              </div>
              {result.details && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground">
                    View Details
                  </summary>
                  <pre className="mt-1 text-xs bg-black/5 p-2 rounded overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>

        {!isAdmin && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              You don't have admin privileges. 
              <Button 
                onClick={fixAdminRole} 
                variant="link" 
                className="p-0 h-auto font-normal"
              >
                Click here to fix admin role
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};