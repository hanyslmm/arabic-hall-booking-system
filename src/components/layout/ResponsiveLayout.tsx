import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Bell, Home, Calendar, Users, BookOpen, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { AdminSidebar } from "./AdminSidebar";
import { cn } from "@/lib/utils";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if device is mobile
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Mobile bottom navigation items
  const bottomNavItems = [
    { title: "الرئيسية", url: "/", icon: Home },
    { title: "الحجوزات", url: "/bookings", icon: Calendar },
    { title: "الطلاب", url: "/students", icon: Users },
    { title: "التقارير", url: "/reports", icon: BookOpen },
    { title: "الإعدادات", url: "/settings", icon: Settings },
  ];

  if (!isMobile) {
    // Desktop: Use the existing AdminSidebar
    return <AdminSidebar>{children}</AdminSidebar>;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Hamburger Sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="right" className="w-[280px] p-0 z-[100]" style={{ direction: 'rtl' }}>
          <AdminSidebar>{null}</AdminSidebar>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="flex h-14 items-center justify-between px-4 border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {/* Title or Logo */}
            <h1 className="text-lg font-semibold text-primary">Science Club</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Bell className="h-5 w-5" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {profile?.full_name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="h-10 w-10 hover:bg-primary/10"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">فتح القائمة</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}