
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { UnifiedLayout } from "@/components/layout/UnifiedLayout";
import { useAuth } from "@/hooks/useAuth";
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
import { Skeleton } from "./components/ui/skeleton";
import { ReactNode } from "react";

const queryClient = new QueryClient();

function RootRoute() {
  const { user, loading, profile, isAdmin, isOwner, canManageUsers } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-12 w-full" />
      </div>
    );
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

function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes wrapped with UnifiedLayout */}
            <Route path="/booking" element={<ProtectedLayout><BookingPage /></ProtectedLayout>} />
            <Route path="/users" element={<ProtectedLayout><UsersPage /></ProtectedLayout>} />
            <Route path="/teachers" element={<ProtectedLayout><TeachersPage /></ProtectedLayout>} />
            <Route path="/halls" element={<ProtectedLayout><HallsPage /></ProtectedLayout>} />
            <Route path="/stages" element={<ProtectedLayout><StagesPage /></ProtectedLayout>} />
            <Route path="/subjects" element={<ProtectedLayout><SubjectsPage /></ProtectedLayout>} />
            <Route path="/bookings" element={<ProtectedLayout><BookingsPage /></ProtectedLayout>} />
            <Route path="/students" element={<ProtectedLayout><StudentsPage /></ProtectedLayout>} />
            <Route path="/student-registrations" element={<ProtectedLayout><StudentRegistrationsPage /></ProtectedLayout>} />
            <Route path="/class-management/:bookingId" element={<ProtectedLayout><ClassManagementPage /></ProtectedLayout>} />
            <Route path="/financial-reports" element={<ProtectedLayout><ClassFinancialReportsPage /></ProtectedLayout>} />
            <Route path="/admin-privileges" element={<ProtectedLayout><AdminPrivilegesPage /></ProtectedLayout>} />
            <Route path="/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />
            <Route path="/reports" element={<ProtectedLayout><ReportsPage /></ProtectedLayout>} />
            <Route path="/audit-logs" element={<ProtectedLayout><AuditLogPage /></ProtectedLayout>} />
            <Route path="/diagnostics" element={<ProtectedLayout><DiagnosticsPage /></ProtectedLayout>} />
            <Route path="/style-showcase" element={<ProtectedLayout><StyleShowcase /></ProtectedLayout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
