
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UnifiedLayout } from "@/components/layout/UnifiedLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { format } from "date-fns";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { CardDescription } from "@/components/ui/card";

interface AuditLog {
  id: string;
  actor_user_id: string;
  action: string;
  details: any;
  created_at: string;
  actor_name?: string;
}

export function AuditLogPage() {
  const { user, isAdmin, isOwner, loading } = useAuth();

  const hasAdminAccess = isAdmin || isOwner;

  // Fetch audit logs with actor names - move before conditional returns
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          actor_user_id,
          action,
          details,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique user IDs to fetch actor names
      const userIds = [...new Set(data.map(log => log.actor_user_id))];
      
      if (userIds.length === 0) return data;

      // Fetch user profiles for actor names
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Map actor names to audit logs
      const profileMap = profiles.reduce((acc: any, profile) => {
        acc[profile.user_id] = profile.name;
        return acc;
      }, {});

      return data.map(log => ({
        ...log,
        actor_name: profileMap[log.actor_user_id] || 'Unknown User'
      }));
    },
    enabled: !loading && user && hasAdminAccess // Only run when user is authenticated and has access
  });

  if (loading) {
    return (
      <UnifiedLayout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner />
        </div>
      </UnifiedLayout>
    );
  }

  if (!user || !hasAdminAccess) {
    return <Navigate to="/login" replace />;
  }

  const getActionDisplayName = (action: string) => {
    const actionMap: { [key: string]: string } = {
      'user_created': 'إنشاء مستخدم',
      'user_updated': 'تحديث مستخدم',
      'user_deleted': 'حذف مستخدم',
      'booking_created': 'إنشاء حجز',
      'booking_updated': 'تحديث حجز',
      'booking_deleted': 'حذف حجز',
      'teacher_created': 'إنشاء معلم',
      'teacher_updated': 'تحديث معلم',
      'teacher_deleted': 'حذف معلم',
      'hall_created': 'إنشاء قاعة',
      'hall_updated': 'تحديث قاعة',
      'hall_deleted': 'حذف قاعة',
      'subject_created': 'إنشاء مادة',
      'subject_updated': 'تحديث مادة',
      'subject_deleted': 'حذف مادة',
      'stage_created': 'إنشاء مرحلة',
      'stage_updated': 'تحديث مرحلة',
      'stage_deleted': 'حذف مرحلة',
    };
    return actionMap[action] || action;
  };

  const getActionBadge = (action: string) => {
    if (action.includes('created')) {
      return <Badge variant="default" className="bg-green-100 text-green-800">إضافة</Badge>;
    } else if (action.includes('updated')) {
      return <Badge variant="secondary">تعديل</Badge>;
    } else if (action.includes('deleted')) {
      return <Badge variant="destructive">حذف</Badge>;
    }
    return <Badge variant="outline">{action}</Badge>;
  };

  const renderDetails = (details: any) => {
    if (!details) return '-';
    
    // Convert details object to readable Arabic text
    const entries = Object.entries(details);
    return entries.map(([key, value]) => (
      <div key={key} className="text-xs text-muted-foreground">
        {key}: {String(value)}
      </div>
    ));
  };

  if (isLoading) {
    return (
      <UnifiedLayout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner />
        </div>
      </UnifiedLayout>
    );
  }

  return (
    <UnifiedLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">سجل التدقيق</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>سجل أنشطة النظام</CardTitle>
            <CardDescription>
              عرض جميع العمليات التي تم تنفيذها في النظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>النشاط</TableHead>
                    <TableHead>التفاصيل</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.actor_name}</TableCell>
                      <TableCell>
                        {getActionBadge(log.action)}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {renderDetails(log.details)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {auditLogs?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">لا توجد سجلات</h3>
                <p>لم يتم تسجيل أي أنشطة بعد</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UnifiedLayout>
  );
}
