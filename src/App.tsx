
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { GlobalNotifications } from "@/components/notifications/GlobalNotifications";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { UnifiedLayout } from "@/components/layout/UnifiedLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { ConfigurationCheck } from "@/components/ConfigurationCheck";
import BookingPage from "./pages/BookingPage";
import UsersPage from "./pages/UsersPage";
import TeachersPage from "./pages/TeachersPage";
import HallsPage from "./pages/HallsPage";
import StagesPage from "./pages/StagesPage";
import SubjectsPage from "./pages/SubjectsPage";
import BookingsPage from "./pages/BookingsPage";
import StudentsPage from "./pages/StudentsPage";
import StudentRegistrationsPage from "./pages/StudentRegistrationsPage";
import ClassManagementPage from "./pages/ClassManagementPage";
import ClassFinancialReportsPage from "./pages/ClassFinancialReportsPage";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import AdminPrivilegesPage from "./pages/AdminPrivilegesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { AuditLogPage } from "./pages/AuditLogPage";
import { StyleShowcase } from "./components/StyleShowcase";
import DiagnosticsPage from "./pages/DiagnosticsPage";
import { ReceptionistDashboard } from "./components/receptionist/ReceptionistDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import { AdminDashboard } from "./components/dashboard/AdminDashboard";
import { ReactNode, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Loading component with spinner
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    </div>
  );
}

function RootRoute() {
  const { user, loading, profile, isAdmin, isOwner, canManageUsers } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = profile?.user_role;
  const isOwnerOrAdmin = isAdmin || isOwner || canManageUsers;

  let dashboard: ReactNode = <ReceptionistDashboard />;
  if (role === "teacher") {
    dashboard = <TeacherDashboard />;
  } else if (isOwnerOrAdmin) {
    dashboard = <AdminDashboard />;
  }

  // Return just the dashboard; layout is applied at the router level
  return <>{dashboard}</>;
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <Suspense fallback={<LoadingScreen />}>
      <UnifiedLayout>
        <Outlet />
      </UnifiedLayout>
    </Suspense>
  );
}

// Component to handle toast events
function ToastEventListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleShowToast = (event: CustomEvent) => {
      const { title, description, variant } = event.detail;
      toast({
        title,
        description,
        variant: variant || "default",
      });
    };

    window.addEventListener('showToast' as any, handleShowToast);
    return () => {
      window.removeEventListener('showToast' as any, handleShowToast);
    };
  }, [toast]);

  return null;
}

const App = () => {
   // Check if Supabase is configured
   if (!isSupabaseConfigured) {
     return <ConfigurationCheck />;
   }
 
   return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ToastEventListener />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              {/* Protected routes with a single, top-level layout */}
              <Route element={<ProtectedLayout />}>
                <Route index element={<RootRoute />} />
                <Route path="booking" element={<BookingPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="teachers" element={<TeachersPage />} />
                <Route path="halls" element={<HallsPage />} />
                <Route path="stages" element={<StagesPage />} />
                <Route path="subjects" element={<SubjectsPage />} />
                <Route path="bookings" element={<BookingsPage />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="student-registrations" element={<StudentRegistrationsPage />} />
                <Route path="class-management/:bookingId" element={<ClassManagementPage />} />
                <Route path="financial-reports" element={<ClassFinancialReportsPage />} />
                <Route path="admin-privileges" element={<AdminPrivilegesPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="audit-logs" element={<AuditLogPage />} />
                <Route path="diagnostics" element={<DiagnosticsPage />} />
                <Route path="style-showcase" element={<StyleShowcase />} />

                {/* Catch-all inside protected layout */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        <GlobalNotifications />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
