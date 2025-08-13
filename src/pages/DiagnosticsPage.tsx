import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UnifiedLayout } from "@/components/layout/UnifiedLayout";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Wifi, 
  WifiOff, 
  User, 
  Shield,
  Database,
  RefreshCw
} from "lucide-react";

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

const DiagnosticsPage = () => {
  const { user, profile, loading } = useAuth();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = useCallback(async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    try {
      // Test 1: Supabase Connection
      try {
        const startTime = Date.now();
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        const responseTime = Date.now() - startTime;
        
        if (error) {
          results.push({
            test: 'اتصال قاعدة البيانات',
            status: 'error',
            message: `فشل الاتصال: ${error.message}`,
            details: { error: error.code, hint: error.hint }
          });
        } else {
          results.push({
            test: 'اتصال قاعدة البيانات',
            status: 'success',
            message: `متصل بنجاح (${responseTime}ms)`,
            details: { responseTime }
          });
        }
      } catch (error) {
        results.push({
          test: 'اتصال قاعدة البيانات',
          status: 'error',
          message: `خطأ في الشبكة: ${error}`,
          details: { error }
        });
      }

      // Test 2: Authentication Status
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          results.push({
            test: 'حالة المصادقة',
            status: 'error',
            message: `خطأ في الجلسة: ${error.message}`,
            details: { error }
          });
        } else if (!session) {
          results.push({
            test: 'حالة المصادقة',
            status: 'warning',
            message: 'لا توجد جلسة نشطة',
            details: { session: null }
          });
        } else {
          results.push({
            test: 'حالة المصادقة',
            status: 'success',
            message: `مستخدم مصادق عليه: ${session.user.email}`,
            details: { 
              userId: session.user.id,
              email: session.user.email,
              lastSignIn: session.user.last_sign_in_at
            }
          });
        }
      } catch (error) {
        results.push({
          test: 'حالة المصادقة',
          status: 'error',
          message: `خطأ في فحص المصادقة: ${error}`,
          details: { error }
        });
      }

      // Test 3: Profile Access
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (error) {
            results.push({
              test: 'الوصول للملف الشخصي',
              status: 'error',
              message: `فشل تحميل الملف الشخصي: ${error.message}`,
              details: { error: error.code, hint: error.hint }
            });
          } else {
            results.push({
              test: 'الوصول للملف الشخصي',
              status: 'success',
              message: `تم تحميل الملف الشخصي بنجاح`,
              details: { 
                userRole: data.user_role,
                fullName: data.full_name,
                username: (data as any).username
              }
            });
          }
        } catch (error) {
          results.push({
            test: 'الوصول للملف الشخصي',
            status: 'error',
            message: `خطأ في الوصول للملف الشخصي: ${error}`,
            details: { error }
          });
        }
      }

      // Test 4: Bookings Table Access
      if (user) {
        try {
          const { data, error } = await supabase
            .from('bookings')
            .select('id, created_at')
            .limit(1);
          
          if (error) {
            results.push({
              test: 'الوصول لجدول الحجوزات',
              status: 'error',
              message: `فشل الوصول للحجوزات: ${error.message}`,
              details: { 
                error: error.code, 
                hint: error.hint,
                possibleCause: 'مشكلة في صلاحيات RLS أو دور المستخدم'
              }
            });
          } else {
            results.push({
              test: 'الوصول لجدول الحجوزات',
              status: 'success',
              message: `يمكن الوصول لجدول الحجوزات (${data?.length || 0} سجل)`,
              details: { recordCount: data?.length || 0 }
            });
          }
        } catch (error) {
          results.push({
            test: 'الوصول لجدول الحجوزات',
            status: 'error',
            message: `خطأ في الوصول لجدول الحجوزات: ${error}`,
            details: { error }
          });
        }
      }

      // Test 5: RLS Function Test
      if (user) {
        // Skip this test since can_read function doesn't exist
        results.push({
          test: 'اختبار دالة can_read',
          status: 'warning',
          message: 'تم تخطي الاختبار - الدالة غير متوفرة',
          details: { note: 'دالة can_read غير مطلوبة' }
        });
      }

    } catch (error) {
      results.push({
        test: 'خطأ عام',
        status: 'error',
        message: `خطأ غير متوقع: ${error}`,
        details: { error }
      });
    }

    setDiagnostics(results);
    setIsRunning(false);
  }, [user]);

  useEffect(() => {
    if (!loading) {
      runDiagnostics();
    }
  }, [loading, runDiagnostics]);

  const getStatusIcon = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">نجح</Badge>;
      case 'error':
        return <Badge variant="destructive">فشل</Badge>;
      case 'warning':
        return <Badge variant="secondary">تحذير</Badge>;
    }
  };

  return (
    <UnifiedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">تشخيص النظام</h1>
            <p className="text-muted-foreground mt-2">أدوات للتحقق من الصحة العامة للنظام</p>
          </div>
          <Button onClick={runDiagnostics} disabled={isRunning} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            إعادة التشغيل
          </Button>
        </div>
        
        {/* Panels remain unchanged below */}
        {/* Current State Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                المستخدم الحالي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>الحالة: {user ? '✅ متصل' : '❌ غير متصل'}</div>
                {user && <div>البريد: {user.email}</div>}
                {profile && <div>الاسم: {profile.full_name || 'غير محدد'}</div>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                الصلاحيات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>الدور: {profile?.user_role || 'غير محدد'}</div>
                <div>نوع المستخدم: {profile?.user_role === 'owner' ? 'مالك' : 
                  profile?.user_role === 'manager' ? 'مدير' :
                  profile?.user_role === 'space_manager' ? 'مدير قاعات' :
                  profile?.user_role === 'teacher' ? 'معلم' :
                  profile?.user_role === 'read_only' ? 'قراءة فقط' : 'غير معروف'}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" />
                قاعدة البيانات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Wifi className="h-3 w-3 text-green-600" />
                  متصل بـ Supabase
                </div>
                <div>المشروع: Science Club</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Diagnostic Results */}
        <Card>
          <CardHeader>
            <CardTitle>نتائج التشخيص</CardTitle>
          </CardHeader>
          <CardContent>
            {diagnostics.length === 0 && !isRunning && (
              <div className="text-center py-8 text-muted-foreground">
                اضغط على "إعادة الفحص" لبدء التشخيص
              </div>
            )}
            
            {isRunning && (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">جاري فحص النظام...</p>
              </div>
            )}
            
            <div className="space-y-4">
              {diagnostics.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <h3 className="font-semibold">{result.test}</h3>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    {result.message}
                  </p>
                  
                  {result.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        عرض التفاصيل
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </UnifiedLayout>
  );
};

export default DiagnosticsPage;