import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { checkAndUpgradeUserPrivileges, forceCreateAdminProfiles } from "@/utils/upgradeAdminPrivileges";
import { supabase } from "@/integrations/supabase/client";

export const UserPrivilegeDebugger = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { user, profile, isAdmin, isOwner, canManageUsers } = useAuth();

  const handleUpgradePrivileges = async () => {
    setLoading(true);
    try {
      const result = await checkAndUpgradeUserPrivileges();
      setResults(result);
    } catch (error) {
      setResults({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleForceCreateProfiles = async () => {
    setLoading(true);
    try {
      const result = await forceCreateAdminProfiles();
      setResults(result);
    } catch (error) {
      setResults({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleManualUpgrade = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Update current user's profile to admin
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: profile?.full_name || 'Administrator',
          user_role: 'owner',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (error) {
        setResults({ 
          success: false, 
          error: `Failed to upgrade user: ${error.message}` 
        });
      } else {
        setResults({ 
          success: true, 
          message: 'User upgraded to owner successfully! Please refresh the page.',
          data 
        });
        
        // Auto-refresh after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error: any) {
      setResults({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>User Privilege Debugger & Upgrader</CardTitle>
        <CardDescription>
          Debug and upgrade user privileges for admin access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current User Info */}
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">Current User Status</h3>
          <div className="space-y-1 text-sm">
            <p><strong>Email:</strong> {user?.email || 'Not logged in'}</p>
            <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
            <p><strong>User Role:</strong> {profile?.user_role || 'N/A'}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant={isAdmin ? "default" : "outline"}>
                isAdmin: {isAdmin ? "✓" : "✗"}
              </Badge>
              <Badge variant={isOwner ? "default" : "outline"}>
                isOwner: {isOwner ? "✓" : "✗"}
              </Badge>
              <Badge variant={canManageUsers ? "default" : "outline"}>
                canManageUsers: {canManageUsers ? "✓" : "✗"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button 
            onClick={handleUpgradePrivileges}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Processing..." : "Check & Upgrade All Admin Users"}
          </Button>
          
          <Button 
            onClick={handleForceCreateProfiles}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? "Processing..." : "Force Create Admin Profiles"}
          </Button>
          
          <Button 
            onClick={handleManualUpgrade}
            disabled={loading || !user}
            variant="destructive"
            className="w-full"
          >
            {loading ? "Processing..." : "Upgrade Current User to Admin"}
          </Button>
        </div>

        {/* Results */}
        {results && (
          <div className={`p-4 border rounded-lg ${results.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
            <h3 className="font-semibold mb-2">
              {results.success ? "✓ Success" : "✗ Error"}
            </h3>
            <p className="text-sm">{results.message || results.error}</p>
            {results.data && (
              <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto">
                {JSON.stringify(results.data, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Instructions</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>1. If you're admin@admin.com or hanyslmm@gmail.com, click "Upgrade Current User to Admin"</li>
            <li>2. Use "Check & Upgrade All Admin Users" to fix both admin emails at once</li>
            <li>3. The page will refresh automatically after successful upgrade</li>
            <li>4. After upgrade, you should see the admin sidebar with full CRUD access</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
