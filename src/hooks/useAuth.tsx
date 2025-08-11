import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { UserProfile, AuthPermissions } from "@/types";
import { usePermissions } from "./usePermissions";

interface AuthContextValue extends AuthPermissions {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout in case auth never resolves due to network issues
    const safetyTimeout = window.setTimeout(() => {
      console.warn("Auth loading exceeded expected time. Proceeding without full profile.");
      setLoading(false);
    }, 15000);

    let initialSessionResolved = false;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting session:", error);
          setLoading(false);
          return;
        }

        setUser(session?.user ?? null);
        if (session?.user) {
          // fetchProfile will set loading to false in finally
          await fetchProfile(session.user.id);
        } else {
          // No session available
          setLoading(false);
        }
        initialSessionResolved = true;
      } catch (error) {
        console.error("Error initializing auth:", error);
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        // Only end loading if the initial session has been processed or this is explicitly INITIAL_SESSION
        if (initialSessionResolved || event === "INITIAL_SESSION") {
          setLoading(false);
        }
      }

      // Ensure we do not keep loading after INITIAL_SESSION
      if (event === "INITIAL_SESSION" && !initialSessionResolved) {
        initialSessionResolved = true;
        if (!session?.user) {
          setLoading(false);
        }
      }
    });

    return () => {
      window.clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        setProfile(null);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const permissions = usePermissions(profile);

  const value: AuthContextValue = useMemo(
    () => ({ user, profile, loading, ...permissions }),
    [user, profile, loading, permissions]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};