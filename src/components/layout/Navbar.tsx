import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useNavigation } from "@/hooks/useNavigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, User, Calendar, Home, Users, Settings, Menu, X, Building2, GraduationCap, BookOpen, Shield } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect } from "react";

interface NavbarProps {
  userRole?: 'owner' | 'manager' | 'space_manager' | 'read_only' | 'teacher';
  userName?: string;
  isAdmin?: boolean;
}

export const Navbar = ({
  userRole,
  userName,
  isAdmin
}: NavbarProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { sidebarOpen, openSidebar, closeSidebar } = useNavigation();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const body = document.body;
    if (sidebarOpen) {
      body.classList.add("overflow-hidden");
    } else {
      body.classList.remove("overflow-hidden");
    }
    return () => body.classList.remove("overflow-hidden");
  }, [sidebarOpen]);

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
      // Fallback navigation
      window.location.href = '/login';
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'owner':
        return <Badge variant="destructive" className="text-xs">مالك</Badge>;
      case 'manager':
        return <Badge variant="secondary" className="text-xs">مدير</Badge>;
      case 'space_manager':
        return <Badge variant="outline" className="text-xs">مدير قاعات</Badge>;
      case 'teacher':
        return <Badge variant="secondary" className="text-xs">معلم</Badge>;
      case 'read_only':
        return <Badge variant="outline" className="text-xs">قراءة فقط</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">مستخدم</Badge>;
    }
  };

  const canManageBookings = userRole === 'owner' || userRole === 'manager';
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'manager';
  const isResourceManager = isOwnerOrAdmin || userRole === 'space_manager';

  const navigation = [
    {
      title: "الإحصائيات",
      items: [
        { title: "لوحة التحكم", url: "/", icon: Home, description: "نظرة عامة على النظام" },
      ],
    },
    {
      title: userRole === 'teacher' ? "المجموعات" : "إدارة الحجوزات",
      items: [
        userRole === 'teacher'
          ? { title: "مراقبة المجموعات", url: "/bookings", icon: Calendar, description: "عرض المجموعات والطلاب والمدفوعات" }
          : { title: "جميع الحجوزات", url: "/bookings", icon: Calendar, description: "عرض وإدارة الحجوزات" },
        ...(
          isOwnerOrAdmin
            ? [{ title: "حجز جديد", url: "/booking", icon: Calendar, description: "إنشاء حجز جديد" }]
            : []
        ),
      ],
    },
    {
      title: "إدارة الطلاب",
      items: [
        { title: "الطلاب", url: "/students", icon: Users, description: "إدارة بيانات الطلاب" },
        { title: "تسجيل الطلاب", url: "/student-registrations", icon: Users, description: "تسجيل الطلاب الجدد" },
      ],
    },
    ...(
      isResourceManager
        ? [{
            title: "إدارة الموارد",
            items: [
              { title: "القاعات", url: "/halls", icon: Building2, description: "إدارة القاعات والمساحات" },
              { title: "المعلمين", url: "/teachers", icon: GraduationCap, description: "إدارة بيانات المعلمين" },
              { title: "المواد الدراسية", url: "/subjects", icon: BookOpen, description: "إدارة المواد الدراسية" },
              { title: "المراحل التعليمية", url: "/stages", icon: GraduationCap, description: "إدارة المراحل الدراسية" },
            ],
          }]
        : []
    ),
    ...(
      isOwnerOrAdmin
        ? [{
            title: "التقارير المالية",
            items: [
              { title: "التقارير", url: "/reports", icon: BookOpen, description: "عرض التقارير المالية" },
              { title: "تقارير المجموعات", url: "/class-financial-reports", icon: BookOpen, description: "التقارير المالية للمجموعات" },
            ],
          }]
        : []
    ),
    ...(
      isOwnerOrAdmin
        ? [{
            title: "إدارة النظام",
            items: [
              { title: "المستخدمين", url: "/users", icon: Users, description: "إدارة المستخدمين والأذونات" },
              { title: "سجل التدقيق", url: "/audit-logs", icon: Shield, description: "عرض سجل أنشطة المستخدمين" },
              { title: "صلاحيات المدراء", url: "/admin-privileges", icon: Settings, description: "إدارة صلاحيات المدراء" },
              { title: "الإعدادات", url: "/settings", icon: Settings, description: "إعدادات النظام العامة" },
            ],
          }]
        : []
    ),
  ];

  return (
    <>
{/* Fixed Burger Menu Button - visible only on small screens */}
<div className="fixed top-4 right-4 z-30 lg:right-6 lg:hidden flex items-center gap-2">
  <Button
    variant="default"
    size="sm"
    onClick={openSidebar}
    className="h-10 w-10 p-0 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105 burger-menu-enter"
  >
    <Menu className="h-5 w-5" />
    <span className="sr-only">فتح القائمة</span>
  </Button>
  <Button
    variant="destructive"
    size="sm"
    onClick={handleSignOut}
    disabled={isLoading}
    className="h-10 px-3 rounded-full shadow-lg"
  >
    <LogOut className="h-4 w-4" />
  </Button>
</div>
<div className="fixed top-4 left-4 z-30 lg:hidden">
  <div className="px-3 py-1 rounded-lg bg-primary/10 text-primary font-bold text-base">Science Club</div>
</div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40"
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

      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-80 sm:w-72 transform bg-card/95 backdrop-blur-md border-l shadow-2xl transition-all duration-300 ease-out",
          sidebarOpen ? "translate-x-0 sidebar-enter" : "translate-x-full"
        )}
      >
        <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 border-b bg-card/90">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-sm sm:text-base">نادي العلوم</span>
              <span className="truncate text-xs text-muted-foreground hidden sm:block">نظام إدارة القاعات</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeSidebar}
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3 sm:px-4 py-4 h-[calc(100vh-14rem)] sm:h-[calc(100vh-16rem)]">
          {navigation.map((group) => (
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

        <div className="border-t p-3 sm:p-4 bg-card/90">
          <div className="flex items-center gap-2 mb-3">
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
              <AvatarFallback className="bg-muted text-xs sm:text-sm">
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-sm">
                {userName || "مستخدم"}
              </span>
              <div className="flex items-center gap-1">
                {getRoleBadge(userRole)}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2 flex-1">
                  <span className="text-xs">
                    {theme === "dark" ? "🌙 ليل" : theme === "light" ? "☀️ نهار" : "🖥️ تلقائي"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setTheme("light")} className="text-sm">
                  ☀️ وضع النهار
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="text-sm">
                  🌙 وضع الليل
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("auto")} className="text-sm">
                  🖥️ تلقائي
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

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
        </div>
      </div>

      <nav className="border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4 space-x-reverse">
            <h1 className="hidden lg:block text-lg sm:text-xl font-bold text-primary">Science Club</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button
              variant="destructive"
              size="sm"
              onClick={handleSignOut}
              disabled={isLoading}
              className="hidden lg:flex h-8 px-3"
            >
              <LogOut className="h-4 w-4 mr-1" />
              خروج
            </Button>
          </div>
        </div>
      </nav>
    </>
  );
};