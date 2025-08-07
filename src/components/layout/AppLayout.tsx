import { useAuth } from "@/hooks/useAuth";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Navbar } from "@/components/layout/Navbar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, isAdmin, isOwner, canManageUsers } = useAuth();
  
  // Use consistent navigation for all users
  return (
    <>
      <Navbar 
        userRole={profile?.user_role} 
        userName={profile?.full_name || profile?.email || undefined}
        isAdmin={isAdmin}
      />
      <main className="container mx-auto p-4 pt-20">
        {children}
      </main>
    </>
  );
}