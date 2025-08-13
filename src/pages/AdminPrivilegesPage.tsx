import { UnifiedLayout } from "@/components/layout/UnifiedLayout";
import { UserPrivilegeManager } from "@/components/admin/UserPrivilegeManager";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const AdminPrivilegesPage = () => {
  const { profile, isAdmin } = useAuth();

  return (
    <UnifiedLayout>
      <div className="space-y-8">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>إدارة صلاحيات المستخدم</CardTitle>
              <CardDescription>ترقية المستخدمين إلى أدوار مختلفة.</CardDescription>
            </div>
            <Button asChild>
              <Link to="/">
                <ArrowRight className="ml-2 h-4 w-4" />
                العودة إلى لوحة التحكم
              </Link>
            </Button>
          </CardHeader>
        </Card>
        
        <div className="max-w-2xl">
          <UserPrivilegeManager />
          
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>معلومات مهمة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">المستخدمون المطلوب ترقيتهم:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>admin@admin.com - مدير النظام الرئيسي</li>
                  <li>hanyslmm@gmail.com - هاني سالم</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">أنواع الصلاحيات:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong>owner:</strong> مالك النظام - صلاحيات كاملة</li>
                  <li><strong>manager:</strong> مدير - صلاحيات إدارية</li>
                  <li><strong>space_manager:</strong> مدير قاعات - إدارة القاعات فقط</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">أنواع الأدوار:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong>ADMIN:</strong> دور إداري في التطبيق</li>
                  <li><strong>USER:</strong> مستخدم عادي</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </UnifiedLayout>
  );
};

export default AdminPrivilegesPage;
