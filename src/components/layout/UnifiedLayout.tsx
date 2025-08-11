import { useAuth } from "@/hooks/useAuth";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Navbar } from "@/components/layout/Navbar";
import { ReceptionistDashboard } from "@/components/receptionist/ReceptionistDashboard";
import TeacherDashboard from "@/pages/TeacherDashboard";

interface UnifiedLayoutProps {
  children: React.ReactNode;
}

export function UnifiedLayout({ children }: UnifiedLayoutProps) {
  const { profile, isAdmin, isOwner, canManageUsers } = useAuth();
  
  const hasAdminAccess = isAdmin || isOwner || canManageUsers;
  const isTeacher = profile?.user_role === 'teacher';
  
  // Check if this is the index/dashboard page for special dashboard handling
  const isIndexPage = window.location.pathname === '/' || window.location.pathname === '/index';

  // All admin users get the consistent AdminSidebar
  if (hasAdminAccess) {
    return (
      <AdminSidebar>
        {/* Show receptionist dashboard on index page, otherwise show regular content */}
        {isIndexPage ? <ReceptionistDashboard /> : children}
      </AdminSidebar>
    );
  }

  // Teachers get their own dashboard on index page
  if (isTeacher) {
    return (
      <>
        <Navbar 
          userRole={profile?.user_role} 
          userName={profile?.full_name || profile?.email || undefined}
          isAdmin={isAdmin}
        />
        <main className="container mx-auto p-4 pt-20">
          {isIndexPage ? <TeacherDashboard /> : children}
        </main>
      </>
    );
  }

  // Regular users get the top navbar
  return (
    <>
      <Navbar 
        userRole={profile?.user_role} 
        userName={profile?.full_name || profile?.email || undefined}
        isAdmin={isAdmin}
      />
      <main className="container mx-auto p-4 pt-20">
        {isIndexPage ? <ReceptionistDashboard /> : children}
      </main>
    </>
  );
}