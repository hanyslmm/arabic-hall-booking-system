
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

  return <UnifiedLayout>{dashboard}</UnifiedLayout>;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <Suspense fallback={<LoadingScreen />}>
      {children}
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
              <Route path="/" element={<RootRoute />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Protected routes wrapped with UnifiedLayout */}
              <Route path="/booking" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
              <Route path="/teachers" element={<ProtectedRoute><TeachersPage /></ProtectedRoute>} />
              <Route path="/halls" element={<ProtectedRoute><HallsPage /></ProtectedRoute>} />
              <Route path="/stages" element={<ProtectedRoute><StagesPage /></ProtectedRoute>} />
              <Route path="/subjects" element={<ProtectedRoute><SubjectsPage /></ProtectedRoute>} />
              <Route path="/bookings" element={<ProtectedRoute><BookingsPage /></ProtectedRoute>} />
              <Route path="/students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
              <Route path="/student-registrations" element={<ProtectedRoute><StudentRegistrationsPage /></ProtectedRoute>} />
              <Route path="/class-management/:bookingId" element={<ProtectedRoute><ClassManagementPage /></ProtectedRoute>} />
              <Route path="/financial-reports" element={<ProtectedRoute><ClassFinancialReportsPage /></ProtectedRoute>} />
              <Route path="/admin-privileges" element={<ProtectedRoute><AdminPrivilegesPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
              <Route path="/audit-logs" element={<ProtectedRoute><AuditLogPage /></ProtectedRoute>} />
              <Route path="/diagnostics" element={<ProtectedRoute><DiagnosticsPage /></ProtectedRoute>} />
                         <Route path="/style-showcase" element={<ProtectedRoute><UnifiedLayout><StyleShowcase /></UnifiedLayout></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
