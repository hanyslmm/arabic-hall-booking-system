import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  Calendar,
  Users,
  Building2,
  GraduationCap,
  BookOpen,
  Settings,
  Menu,
  X,
  LogOut,
  Shield,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigation } from "@/hooks/useNavigation";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect } from "react";

interface NavigationGroup {
  title: string;
  items: { title: string; url: string; icon: any; description?: string }[];
}

interface AdminSidebarProps {
  children: React.ReactNode;
  navigation?: NavigationGroup[];
  appTitle?: string;
  appSubtitle?: string;
}

const defaultNavigation: NavigationGroup[] = [
  {
    title: "الإحصائيات",
    items: [
      {
        title: "لوحة التحكم",
        url: "/",
        icon: Home,
        description: "نظرة عامة على النظام",
      },
    ],
  },
  {
    title: "إدارة الحجوزات",
    items: [
      {
        title: "جميع الحجوزات",
        url: "/bookings",
        icon: Calendar,
        description: "عرض وإدارة الحجوزات",
      },
      {
        title: "حجز جديد",
        url: "/booking",
        icon: Calendar,
        description: "إنشاء حجز جديد",
      },
    ],
  },
  {
    title: "إدارة الطلاب",
    items: [
      {
        title: "الطلاب",
        url: "/students",
        icon: Users,
        description: "إدارة بيانات الطلاب",
      },
      {
        title: "تسجيل الطلاب",
        url: "/student-registrations",
        icon: Users,
        description: "تسجيل الطلاب الجدد",
      },
      {
        title: "إدارة المجموعة",
        url: "/bookings",
        icon: GraduationCap,
        description: "إدارة الحضور والدفعات",
      },
    ],
  },
  {
    title: "إدارة الموارد",
    items: [
      {
        title: "القاعات",
        url: "/halls",
        icon: Building2,
        description: "إدارة القاعات والمساحات",
      },
      {
        title: "المعلمين",
        url: "/teachers",
        icon: GraduationCap,
        description: "إدارة بيانات المعلمين",
      },
      {
        title: "المواد الدراسية",
        url: "/subjects",
        icon: BookOpen,
        description: "إدارة المواد الدراسية",
      },
      {
        title: "المراحل التعليمية",
        url: "/stages",
        icon: GraduationCap,
        description: "إدارة المراحل الدراسية",
      },
    ],
  },
  {
    title: "التقارير المالية",
    items: [
      {
        title: "التقارير",
        url: "/reports",
        icon: BookOpen,
        description: "عرض التقارير المالية",
      },
      {
        title: "تقارير المجموعات",
        url: "/class-financial-reports",
        icon: BookOpen,
        description: "التقارير المالية للمجموعات",
      },
    ],
  },
  {
    title: "إدارة النظام",
    items: [
      {
        title: "المستخدمين",
        url: "/users",
        icon: Users,
        description: "إدارة المستخدمين والأذونات",
      },
      {
        title: "سجل التدقيق",
        url: "/audit-logs",
        icon: Shield,
        description: "عرض سجل أنشطة المستخدمين",
      },
      {
        title: "صلاحيات المدراء",
        url: "/admin-privileges",
        icon: Settings,
        description: "إدارة صلاحيات المدراء",
      },
      {
        title: "الإعدادات",
        url: "/settings",
        icon: Settings,
        description: "إعدادات النظام العامة",
      },
    ],
  },
];

const LogoutButton = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
    setIsLoading(false);
    try {
      window.location.replace('/login');
    } catch (e) {
      window.location.href = '/login';
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSignOut}
      disabled={isLoading}
      className="w-full flex items-center gap-2 text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10 h-9"
    >
      <LogOut className="h-4 w-4" />
      <span className="text-sm">{isLoading ? "جاري الخروج..." : "تسجيل الخروج"}</span>
    </Button>
  );
};

export function AdminSidebar({ children, navigation, appTitle, appSubtitle }: AdminSidebarProps) {
  const { sidebarOpen, openSidebar, closeSidebar } = useNavigation();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const navGroups = navigation ?? defaultNavigation;

  // Lock body scroll when sidebar is open (mobile drawer)
  useEffect(() => {
    const body = document.body;
    if (sidebarOpen) {
      body.classList.add("overflow-hidden");
    } else {
      body.classList.remove("overflow-hidden");
    }
    return () => body.classList.remove("overflow-hidden");
  }, [sidebarOpen]);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "owner":
        return (
          <Badge variant="destructive" className="text-xs">
            مالك
          </Badge>
        );
      case "manager":
        return (
          <Badge variant="secondary" className="text-xs">
            مدير
          </Badge>
        );
      case "space_manager":
        return (
          <Badge variant="outline" className="text-xs">
            مدير قاعات
          </Badge>
        );
      case "read_only":
        return (
          <Badge variant="outline" className="text-xs">
            قراءة فقط
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            مستخدم
          </Badge>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Fixed Burger Menu Button - Always visible in top-right */}
      <div className="fixed top-4 right-4 z-[60] lg:right-6">
        <Button
          variant="default"
          size="sm"
          onClick={openSidebar}
          className="h-10 w-10 p-0 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105 burger-menu-enter lg:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">فتح القائمة</span>
        </Button>
      </div>

      {/* Mobile backdrop with improved touch handling */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={closeSidebar}
          onTouchStart={(e) => {
            if (e.target === e.currentTarget) {
              closeSidebar();
            }
          }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        </div>
      )}

      {/* Enhanced Sidebar */}
      <div
        className={cn(
          // Mobile: full-screen sheet; Desktop: fixed sidebar
          "fixed inset-0 right-0 z-50 w-full transform bg-card/95 backdrop-blur-md border-l shadow-2xl transition-all duration-300 ease-out sm:inset-y-0 sm:left-auto sm:w-72 sm:bg-card sm:shadow-none sm:translate-x-0",
          sidebarOpen ? "translate-x-0 sidebar-enter" : "translate-x-full"
        )}
        style={{ direction: 'rtl' }}
      >
        {/* Sidebar Header - More compact on mobile */}
        <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 border-b bg-card/90">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-sm sm:text-base">{appTitle ?? 'نادي العلوم'}</span>
              <span className="truncate text-xs text-muted-foreground hidden sm:block">{appSubtitle ?? 'لوحة التحكم الإدارية'}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeSidebar}
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Sidebar Content with improved scrolling */}
        <ScrollArea className="flex-1 px-3 sm:px-4 py-4 h-[calc(100vh-14rem)] sm:h-[calc(100vh-16rem)]">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-6">
              <h3 className="mb-2 text-xs sm:text-sm font-semibold text-muted-foreground px-2">
                {group.title}
              </h3>
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <button
                      key={item.title}
                      onClick={() => {
                        navigate(item.url);
                        closeSidebar();
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-3 sm:py-2 text-sm text-right transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm scale-[0.98]"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-[0.98]"
                      )}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">{item.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </ScrollArea>

        {/* Sidebar Footer - More compact */}
        <div className="border-t p-3 sm:p-4 bg-card/90">
          <div className="flex items-center gap-2 mb-3">
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
              <AvatarFallback className="bg-muted text-xs sm:text-sm">
                {profile?.full_name
                  ? profile.full_name.charAt(0).toUpperCase()
                  : profile?.email?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-sm">
                {profile?.full_name || profile?.email || "مستخدم"}
              </span>
              <div className="flex items-center gap-1">
                {getRoleBadge(profile?.user_role)}
              </div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:mr-72">
        {/* Top Header - simplified and without burger */}
        <header className="flex h-14 sm:h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4">
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-lg sm:text-xl font-bold text-primary">Science Club</h1>
            <div className="flex items-center gap-2">
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Page Content with improved scrolling */}
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  );
}
