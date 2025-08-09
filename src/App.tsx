
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import Index from "./pages/Index";
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

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/teachers" element={<TeachersPage />} />
            <Route path="/halls" element={<HallsPage />} />
            <Route path="/stages" element={<StagesPage />} />
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/students" element={<StudentsPage />} />
          <Route path="/student-registrations" element={<StudentRegistrationsPage />} />
          <Route path="/class-management/:bookingId" element={<ClassManagementPage />} />
          <Route path="/financial-reports" element={<ClassFinancialReportsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin-privileges" element={<AdminPrivilegesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/audit-logs" element={<AuditLogPage />} />
            <Route path="/diagnostics" element={<DiagnosticsPage />} />
            <Route path="/style-showcase" element={<StyleShowcase />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
