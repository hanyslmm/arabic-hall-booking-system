import React, { createContext, useContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Home, Calendar, Users, Building2, GraduationCap, BookOpen, Settings, Shield, FileText, UserPlus, ClipboardList } from "lucide-react";

interface UnifiedLayoutProps {
  children: React.ReactNode;
}

// Prevent nested layouts from rendering duplicated chrome
const LayoutAppliedContext = createContext<boolean>(false);

export function UnifiedLayout({ children }: UnifiedLayoutProps) {
  const isNested = useContext(LayoutAppliedContext);
  const { profile, isAdmin, isOwner, canManageUsers } = useAuth();
  
  const userRole = profile?.user_role;
  const isOwnerOrAdmin = isAdmin || isOwner || canManageUsers;
  const isTeacher = userRole === 'teacher';

  // Build navigation based on role - ensuring admin/owner can see everything
  const navigation = [
    {
      title: "الإحصائيات",
      items: [
        { title: "لوحة التحكم", url: "/", icon: Home },
      ],
    },
    {
      title: isTeacher ? "المجموعات" : "إدارة المجموعات",
      items: [
        {
          title: isTeacher ? "مراقبة المجموعات" : "جميع المجموعات",
          url: "/bookings",
          icon: Calendar
        },
        ...(
          isOwnerOrAdmin && !isTeacher
            ? [{ title: "حجز جديد", url: "/booking", icon: Calendar }]
            : []
        ),
      ] as any,
    },
    {
      title: "إدارة الطلاب",
      items: [
        { title: "الطلاب", url: "/students", icon: Users },
        { title: "تسجيل الطلاب", url: "/student-registrations", icon: UserPlus },
      ],
    },
    ...(
      // Show resource management for admins, owners, and space managers (but not teachers)
      (isOwnerOrAdmin || userRole === 'space_manager') && !isTeacher
        ? [{
            title: "إدارة الموارد",
            items: [
              { title: "القاعات", url: "/halls", icon: Building2 },
              { title: "المعلمين", url: "/teachers", icon: GraduationCap },
              { title: "المواد الدراسية", url: "/subjects", icon: BookOpen },
              { title: "المراحل التعليمية", url: "/stages", icon: GraduationCap },
            ],
          }]
        : []
    ),
    ...(
      // Show financial reports for admins and owners only
      isOwnerOrAdmin && !isTeacher
        ? [{
            title: "التقارير المالية",
            items: [
              { title: "التقارير", url: "/reports", icon: FileText },
              { title: "تقارير المجموعات", url: "/financial-reports", icon: ClipboardList },
            ],
          }]
        : []
    ),
    ...(
      // Show system management for admins and owners only
      isOwnerOrAdmin && !isTeacher
        ? [{
            title: "إدارة النظام",
            items: [
              { title: "المستخدمين", url: "/users", icon: Users },
              { title: "سجل التدقيق", url: "/audit-logs", icon: Shield },
              { title: "صلاحيات المدراء", url: "/admin-privileges", icon: Shield },
              { title: "الإعدادات", url: "/settings", icon: Settings },
            ],
          }]
        : []
    ),
  ];

  // Determine the appropriate title and subtitle based on role
  const appTitle = "Science Club";
  let appSubtitle = "لوحة التحكم";
  
  if (isOwner || userRole === 'owner') {
    appSubtitle = "لوحة التحكم الإدارية - مالك";
  } else if (isAdmin || userRole === 'manager') {
    appSubtitle = "لوحة التحكم الإدارية - مدير";
  } else if (userRole === 'teacher') {
    appSubtitle = "لوحة المعلم";
  } else if (userRole === 'space_manager') {
    appSubtitle = "لوحة مدير القاعات";
  }

  // If layout already applied higher in the tree, render children only
  if (isNested) {
    return <>{children}</>;
  }

  return (
    <LayoutAppliedContext.Provider value={true}>
      <div className="min-h-screen bg-background">
        <AdminSidebar 
          navigation={navigation as any} 
          appTitle={appTitle} 
          appSubtitle={appSubtitle}
        >
          {children}
        </AdminSidebar>
      </div>
    </LayoutAppliedContext.Provider>
  );
}