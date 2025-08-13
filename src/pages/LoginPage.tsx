import { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const trySignIn = async (emailCandidate: string, pwd: string) => {
    if (!isSupabaseConfigured) {
      throw new Error("Database connection not configured. Please contact your administrator.");
    }
    const { error } = await supabase.auth.signInWithPassword({ email: emailCandidate, password: pwd });
    return error;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured) {
      toast({
        title: "Configuration Error",
        description: "The application is not properly configured. Please contact your administrator.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const raw = username.trim();
      const isEmailInput = raw.includes("@");
      const normalized = raw.toLowerCase();

      // Build candidate emails in order of likelihood without hitting DB first
      const candidates: string[] = [];
      if (isEmailInput) {
        candidates.push(raw);
      } else {
        if (normalized === "admin") {
          candidates.push("admin@system.local");
        } else if (["sc_manager", "sc-manager", "scmanager"].includes(normalized)) {
          candidates.push("sc_manager@system.local");
        }
        // Generated email convention
        candidates.push(`${raw}@local.app`);
      }

      // Try candidates sequentially
      let lastError: any = null;
      for (const candidate of candidates) {
        const error = await trySignIn(candidate, password);
        if (!error) {
          toast({ title: "تم تسجيل الدخول", description: "مرحبًا بك!" });
          navigate("/", { replace: true });
          return;
        }
        lastError = error;
      }

      // Fallback: resolve by profiles.username -> email, then try
      if (!isEmailInput) {
        const { data: profileByUsername } = await supabase
          .from("profiles")
          .select("email")
          .eq("username", raw)
          .maybeSingle();

        if (profileByUsername?.email) {
          const error = await trySignIn(profileByUsername.email, password);
          if (!error) {
            toast({ title: "تم تسجيل الدخول", description: "مرحبًا بك!" });
            navigate("/", { replace: true });
            return;
          }
          lastError = error;
        }
      }

      throw lastError || new Error("فشل تسجيل الدخول");
    } catch (error: any) {
      toast({
        title: "فشل تسجيل الدخول",
        description: error?.message || "خطأ في تسجيل الدخول",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // If already authenticated, redirect away from login
  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-100 to-gray-100 dark:from-orange-900 dark:to-gray-900">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader>
          <CardTitle className="text-3xl text-center font-bold text-primary">
            تسجيل الدخول
            <br />
            Science Club
          </CardTitle>
          <p className="text-center text-muted-foreground mt-2 text-lg italic font-medium">
            Unlock your vision
          </p>
        </CardHeader>
        <CardContent>
          {!isSupabaseConfigured && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The application is not properly configured. Please ensure environment variables are set correctly.
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Input
                type="text"
                placeholder="اسم المستخدم أو البريد الإلكتروني"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                disabled={!isSupabaseConfigured}
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="كلمة المرور"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={!isSupabaseConfigured}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !isSupabaseConfigured}>
              {loading ? "جاري الدخول..." : !isSupabaseConfigured ? "Configuration Required" : "دخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}