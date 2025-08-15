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
  ChevronLeft,
  ChevronRight,
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
        url: "/financial-reports",
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
  const { profile, isAdmin, isOwner, canManageUsers } = useAuth();

  const navGroups = navigation ?? defaultNavigation;

  // Make bottom nav height available as a CSS variable for dynamic padding
  const bottomNavHeightPx = 64; // keep in sync with bottom nav visual height

  // Generate breadcrumbs from current path
  const getBreadcrumbs = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    
    // Find the current page in navigation
    let currentPage = null;
    for (const group of navGroups) {
      const found = group.items.find(item => item.url === path);
      if (found) {
        currentPage = found;
        break;
      }
    }

    if (path === '/') {
      return [{ title: 'الرئيسية', url: '/' }];
    }

    const breadcrumbs = [{ title: 'الرئيسية', url: '/' }];
    
    if (currentPage) {
      breadcrumbs.push({ title: currentPage.title, url: currentPage.url });
    } else if (segments.length > 0) {
      // Handle dynamic routes like /class-management/:id
      const baseSegment = segments[0];
      for (const group of navGroups) {
        const found = group.items.find(item => item.url.includes(baseSegment));
        if (found) {
          breadcrumbs.push({ title: found.title, url: found.url });
          break;
        }
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

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
      case "teacher":
        return (
          <Badge variant="outline" className="text-xs">
            معلم
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

  // Quick access mobile bottom navigation items based on role/permissions and available routes
  const isOwnerOrAdmin = isAdmin || isOwner || canManageUsers;
  const isTeacher = profile?.user_role === 'teacher';

  const baseCandidates = [
    { title: "الرئيسية", url: "/", icon: Home, show: true },
    { title: "الحجوزات", url: "/bookings", icon: Calendar, show: true },
    { title: "الطلاب", url: "/students", icon: Users, show: true },
    { title: "التقارير", url: "/reports", icon: BookOpen, show: isOwnerOrAdmin },
    { title: "الإعدادات", url: "/settings", icon: Settings, show: isOwnerOrAdmin },
  ];

  const quickNav = baseCandidates
    .filter((c) => c.show)
    .filter((candidate) =>
      navGroups.some((group) => group.items.some((it) => it.url === candidate.url))
    )
    // Limit to 5 items and prefer core items for teachers vs admins
    .slice(0, 5);

  // Sidebar content component (reusable for both mobile and desktop)
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-card via-card/98 to-card/95">
      {/* Sidebar Header - Enhanced with better visual hierarchy */}
      <div className="flex h-16 sm:h-18 items-center justify-between px-4 sm:px-5 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-primary-foreground shadow-lg shadow-primary/20">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate font-bold text-base sm:text-lg bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              {appTitle ?? 'نادي العلوم'}
            </span>
            <span className="truncate text-xs text-muted-foreground/80 hidden sm:block">
              {appSubtitle ?? 'لوحة التحكم الإدارية'}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={closeSidebar}
          className="h-9 w-9 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive transition-all duration-200 lg:hidden"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar Content with improved scrolling and spacing */}
      <ScrollArea className="flex-1 px-3 sm:px-4 py-5 h-[calc(100vh-20rem)] sm:h-[calc(100vh-22rem)]">
        {navGroups.map((group, groupIndex) => (
          <div key={group.title} className={cn(
            "mb-7 pb-5",
            groupIndex < navGroups.length - 1 && "border-b border-border/30"
          )}>
            <h3 className="mb-3 text-xs sm:text-sm font-bold text-muted-foreground/70 px-3 uppercase tracking-wider">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <button
                    key={item.url}
                    onClick={() => {
                      navigate(item.url);
                      closeSidebar();
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-medium shadow-sm border border-primary/20"
                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-md" 
                        : "bg-muted/50"
                    )}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 text-right">
                      <div className="font-medium">{item.title}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground/70 mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </ScrollArea>

      {/* Enhanced Bottom Section with Booking Info */}
      <div className="mt-auto border-t border-border/50 bg-gradient-to-t from-background/50 to-transparent">
        {/* Booking Summary Section - New Addition */}
        <div className="px-4 py-4 space-y-3">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-3 border border-primary/20">
            <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              ملخص حالة الدفع اليوم
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">إجمالي الطلاب</span>
                <span className="font-bold text-foreground">84</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">الحضور حتى الآن</span>
                <span className="font-bold text-green-600">80</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-primary-dark h-full transition-all duration-500" style={{ width: '95%' }}></div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card/50 rounded-lg p-2 text-center border border-border/30">
              <div className="text-xs text-muted-foreground">القاعة الأولى</div>
              <div className="text-sm font-bold text-foreground">140 جنيه</div>
            </div>
            <div className="bg-card/50 rounded-lg p-2 text-center border border-border/30">
              <div className="text-xs text-muted-foreground">عدد الطلاب</div>
              <div className="text-sm font-bold text-foreground">84 طالب</div>
            </div>
            <div className="bg-card/50 rounded-lg p-2 text-center border border-border/30">
              <div className="text-xs text-muted-foreground">الوقت</div>
              <div className="text-sm font-bold text-foreground">14:00</div>
            </div>
          </div>
        </div>

        {/* User Profile Section - Enhanced */}
        <div className="px-4 py-3 border-t border-border/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold">
                  {profile?.full_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="grid gap-0.5">
                <p className="text-sm font-semibold leading-none">{profile?.full_name || "مستخدم"}</p>
                {getRoleBadge(profile?.user_role)}
              </div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background" style={{ ['--bottom-nav-height' as any]: `${bottomNavHeightPx}px` }}>
      {/* Desktop Sidebar - Always visible on large screens */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:z-50 border-l bg-card" style={{ direction: 'rtl' }}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar - Using Sheet component for better mobile experience */}
      <Sheet open={sidebarOpen} onOpenChange={(open) => open ? openSidebar() : closeSidebar()}>
        <SheetContent side="right" className="w-[85%] max-w-sm p-0 overflow-hidden" style={{ direction: 'rtl' }}>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:mr-72">
        {/* Top Header - with breadcrumbs and navigation buttons */}
        <header className="flex h-14 sm:h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 sticky top-0 z-40">
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Hamburger Menu Button - Only visible on mobile/tablet */}
              <Button
                variant="ghost"
                size="icon"
                onClick={openSidebar}
                className="lg:hidden relative h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-200 group"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                <Menu className="h-5 w-5 relative z-10 transition-transform duration-200 group-hover:scale-110" />
                <span className="sr-only">فتح القائمة</span>
              </Button>
              
              {/* Navigation buttons for desktop */}
              <div className="hidden md:flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.history.back()}
                  className="h-8 w-8 p-0"
                  title="رجوع"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.history.forward()}
                  className="h-8 w-8 p-0"
                  title="تقدم"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>

              {/* Breadcrumbs */}
              <Breadcrumb className="hidden md:flex">
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.url} className="flex items-center gap-2">
                      {index > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {index === breadcrumbs.length - 1 ? (
                          <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink 
                            className="cursor-pointer hover:text-primary"
                            onClick={() => navigate(crumb.url)}
                          >
                            {crumb.title}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </div>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>

              <h1 className="text-lg sm:text-xl font-bold text-primary md:hidden">{appTitle ?? 'نادي العلوم'}</h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Page Content with improved scrolling and space for mobile bottom bar */}
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+16px)] md:pb-6">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-[56] md:hidden">
        <div className="mx-auto max-w-screen-sm">
          <div className="border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 pb-[env(safe-area-inset-bottom)]">
            <nav className="grid grid-cols-5 items-center">
              {quickNav.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <button
                    key={item.url}
                    onClick={() => navigate(item.url)}
                    className={cn(
                      "flex flex-col items-center justify-center py-2 text-[11px] leading-tight",
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5", isActive && "scale-110")} />
                    <span className="mt-1">{item.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
