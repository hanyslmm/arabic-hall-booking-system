import { useAuth } from "@/hooks/useAuth";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Home, Calendar, Users, Building2, GraduationCap, BookOpen, Settings, Shield } from "lucide-react";

interface UnifiedLayoutProps {
  children: React.ReactNode;
}

export function UnifiedLayout({ children }: UnifiedLayoutProps) {
  const { profile, isAdmin, isOwner, canManageUsers } = useAuth();
  
  const userRole = profile?.user_role;
  const isOwnerOrAdmin = isAdmin || isOwner || canManageUsers;
  const isTeacher = userRole === 'teacher';

  // Build navigation based on role
  const navigation = [
    {
      title: "الإحصائيات",
      items: [
        { title: "لوحة التحكم", url: "/", icon: Home },
      ],
    },
    {
      title: isTeacher ? "المجموعات" : "إدارة الحجوزات",
      items: [
        isTeacher
          ? { title: "مراقبة المجموعات", url: "/bookings", icon: Calendar }
          : { title: "جميع الحجوزات", url: "/bookings", icon: Calendar },
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
        { title: "تسجيل الطلاب", url: "/student-registrations", icon: Users },
      ],
    },
    ...(
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
      isOwnerOrAdmin && !isTeacher
        ? [{
            title: "التقارير المالية",
            items: [
              { title: "التقارير", url: "/reports", icon: BookOpen },
              { title: "تقارير المجموعات", url: "/financial-reports", icon: BookOpen },
            ],
          }]
        : []
    ),
    ...(
      isOwnerOrAdmin && !isTeacher
        ? [{
            title: "إدارة النظام",
            items: [
              { title: "المستخدمين", url: "/users", icon: Users },
              { title: "سجل التدقيق", url: "/audit-logs", icon: Shield },
              { title: "صلاحيات المدراء", url: "/admin-privileges", icon: Settings },
              { title: "الإعدادات", url: "/settings", icon: Settings },
            ],
          }]
        : []
    ),
  ];

  return (
    <AdminSidebar navigation={navigation as any} appTitle="نادي العلوم" appSubtitle={isOwnerOrAdmin ? "لوحة التحكم الإدارية" : undefined}>
      {children}
    </AdminSidebar>
  );
}