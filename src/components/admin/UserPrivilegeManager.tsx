import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  grantAdminPrivileges, 
  grantReadOnlyPrivileges, 
  getAllUsers, 
  upgradeAllExistingUsers,
  getRoleDisplayName,
  canPerformAdminActions,
  type UserProfile 
} from "@/utils/privilegeManager";
import { Shield, User, UserCheck, Eye, Settings, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const UserPrivilegeManager = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [upgradeAllLoading, setUpgradeAllLoading] = useState(false);
  const [readOnlyLoading, setReadOnlyLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const { toast } = useToast();

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleGrantAdminPrivileges = async () => {
    if (!email.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال البريد الإلكتروني",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await grantAdminPrivileges(email.trim());
      
      if (result.success) {
        toast({
          title: "نجح التحديث",
          description: result.message,
        });
        setEmail("");
        loadUsers(); // Refresh the users list
      } else {
        toast({
          title: "فشل التحديث",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء منح صلاحيات المدير",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGrantReadOnlyPrivileges = async () => {
    if (!email.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال البريد الإلكتروني",
        variant: "destructive",
      });
      return;
    }

    setReadOnlyLoading(true);
    try {
      const result = await grantReadOnlyPrivileges(email.trim());
      
      if (result.success) {
        toast({
          title: "نجح التحديث",
          description: result.message,
        });
        setEmail("");
        loadUsers(); // Refresh the users list
      } else {
        toast({
          title: "فشل التحديث",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء منح صلاحيات القراءة فقط",
        variant: "destructive",
      });
    } finally {
      setReadOnlyLoading(false);
    }
  };

  const handleUpgradeAllUsers = async () => {
    setUpgradeAllLoading(true);
    try {
      const results = await upgradeAllExistingUsers();
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        toast({
          title: "نجح التحديث الشامل",
          description: `تم ترقية ${successCount} مستخدم بنجاح${failCount > 0 ? ` وفشل في ترقية ${failCount}` : ''}`,
        });
        loadUsers(); // Refresh the users list
      } else {
        toast({
          title: "فشل التحديث الشامل",
          description: "لم يتم ترقية أي مستخدم",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الترقية الشاملة للمستخدمين",
        variant: "destructive",
      });
    } finally {
      setUpgradeAllLoading(false);
    }
  };

  const getRoleBadgeVariant = (userRole: string) => {
    if (userRole === 'owner') return 'destructive';
    if (userRole === 'manager') return 'default';
    if (userRole === 'read_only') return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">إدارة صلاحيات المستخدمين</h2>
        <p className="text-gray-600">منح وإدارة صلاحيات المستخدمين في النظام</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Grant Admin Privileges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              منح صلاحيات المدير
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني للمستخدم
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="أدخل البريد الإلكتروني"
                className="text-right"
                dir="ltr"
              />
            </div>
            <Button
              onClick={handleGrantAdminPrivileges}
              disabled={loading}
              className="w-full"
            >
              {loading ? "جاري المعالجة..." : "منح صلاحيات المدير"}
            </Button>
          </CardContent>
        </Card>

        {/* Grant Read-Only Privileges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              منح صلاحيات القراءة فقط
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني للمستخدم
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="أدخل البريد الإلكتروني"
                className="text-right"
                dir="ltr"
              />
            </div>
            <Button
              onClick={handleGrantReadOnlyPrivileges}
              disabled={readOnlyLoading}
              variant="outline"
              className="w-full"
            >
              {readOnlyLoading ? "جاري المعالجة..." : "منح صلاحيات القراءة فقط"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-600" />
            العمليات الشاملة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ترقية جميع المستخدمين الحاليين إلى صلاحيات المدير كإجراء مؤقت لحل مشاكل الصلاحيات
            </p>
            <Button
              onClick={handleUpgradeAllUsers}
              disabled={upgradeAllLoading}
              variant="outline"
              className="w-full"
            >
              {upgradeAllLoading ? "جاري الترقية..." : "ترقية جميع المستخدمين إلى مدير"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            قائمة المستخدمين
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-4">جاري تحميل المستخدمين...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-4 text-gray-500">لا توجد مستخدمون</div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium">{user.full_name || user.email}</div>
                      <div className="text-sm text-gray-500" dir="ltr">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(user.user_role)}>
                      {getRoleDisplayName(user.user_role)}
                    </Badge>
                    {canPerformAdminActions(user.user_role) && (
                      <UserCheck className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
