import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setupAdminAccount, checkExistingUsers, forceCreateAdminProfile } from "@/utils/setupAdmin";
import { upgradeAllExistingUsers, grantAdminPrivileges } from "@/utils/privilegeManager";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, UserPlus, Users, Settings } from "lucide-react";

export const AdminSetup = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [existingUsers, setExistingUsers] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    checkExistingUsers().then(setExistingUsers);
    
    // Add debug info about Supabase connection
    setDebugInfo(`Supabase URL: ${import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Not Set'}`);
  }, []);

  const handleSetupAdmin = async () => {
    setIsCreating(true);
    const result = await setupAdminAccount();
    
    if (result.success) {
      toast({
        title: "تم إنشاء حساب المدير بنجاح",
        description: "يمكنك الآن تسجيل الدخول باستخدام: admin / admin123",
      });
      setIsCompleted(true);
      checkExistingUsers().then(setExistingUsers);
    } else {
      toast({
        title: "خطأ في إنشاء حساب المدير",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsCreating(false);
  };

  const handleForceCreateProfile = async () => {
    setIsCreating(true);
    const result = await forceCreateAdminProfile();
    
    toast({
      title: result.success ? "تم إنشاء الملف الشخصي" : "خطأ",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
    
    if (result.success) {
      checkExistingUsers().then(setExistingUsers);
    }
    setIsCreating(false);
  };

  const handleUpgradeAllUsers = async () => {
    setIsCreating(true);
    try {
      const results = await upgradeAllExistingUsers();
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      toast({
        title: successCount > 0 ? "نجح التحديث" : "فشل التحديث",
        description: `تم ترقية ${successCount} مستخدم${failCount > 0 ? ` وفشل في ${failCount}` : ''}`,
        variant: successCount > 0 ? "default" : "destructive",
      });
      
      if (successCount > 0) {
        checkExistingUsers().then(setExistingUsers);
      }
    } catch (error: any) {
      toast({
        title: "خطأ في الترقية",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleFixAdminPrivileges = async () => {
    setIsCreating(true);
    try {
      const adminEmails = ['admin@admin.com', 'hanyslmm@gmail.com'];
      let successCount = 0;
      
      for (const email of adminEmails) {
        const result = await grantAdminPrivileges(email);
        if (result.success) successCount++;
      }
      
      toast({
        title: successCount > 0 ? "تم إصلاح الصلاحيات" : "فشل في الإصلاح",
        description: `تم إصلاح صلاحيات ${successCount} من ${adminEmails.length} مدير`,
        variant: successCount > 0 ? "default" : "destructive",
      });
      
      if (successCount > 0) {
        checkExistingUsers().then(setExistingUsers);
      }
    } catch (error: any) {
      toast({
        title: "خطأ في الإصلاح",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleTestLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "admin@example.com",
        password: "admin123"
      });

      if (error) {
        toast({
          title: "فشل تسجيل الدخول التجريبي",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "نجح تسجيل الدخول التجريبي",
          description: "حساب المدير يعمل بشكل صحيح!",
        });
        setIsCompleted(true);
      }
    } catch (error: any) {
      toast({
        title: "خطأ في الاختبار",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateScManager = async () => {
    setIsCreating(true);
    try {
      // Check if sc_manager already exists in the database
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', 'sc_manager@system.local')
        .single();

      if (existingUser && !checkError) {
        toast({
          title: "حساب sc_manager موجود بالفعل",
          description: "حساب sc_manager موجود في قاعدة البيانات",
          variant: "default",
        });
        setIsCreating(false);
        return;
      }

      // If user doesn't exist, the migration should have created it
      toast({
        title: "حساب sc_manager جاهز",
        description: "يمكنك تسجيل الدخول باستخدام: sc_manager / Voda@123",
        variant: "default",
      });
      
    } catch (error: any) {
      toast({
        title: "خطأ في إنشاء حساب sc_manager",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleFixHanyPrivileges = async () => {
    setIsCreating(true);
    try {
      const result = await grantAdminPrivileges('hanyslmm@gmail.com');
      
      toast({
        title: result.success ? "تم إصلاح صلاحيات hanyslmm@gmail.com" : "فشل في الإصلاح",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      
      if (result.success) {
        checkExistingUsers().then(setExistingUsers);
      }
    } catch (error: any) {
      toast({
        title: "خطأ في إصلاح الصلاحيات",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isCompleted) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center text-green-600">تم إنشاء حساب المدير</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4">يمكنك الآن تسجيل الدخول باستخدام:</p>
          <p className="font-bold">اسم المستخدم: admin</p>
          <p className="font-bold">كلمة المرور: admin123</p>
          {existingUsers.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">المستخدمون المتاحون:</p>
              <ul className="text-sm">
                {existingUsers.map((user, index) => (
                  <li key={index} className="border-b py-1">
                    {user.email} - {user.user_role}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">إعداد النظام وإصلاح الصلاحيات</h2>
        <p className="text-gray-600">إنشاء حساب المدير وإصلاح مشاكل الصلاحيات</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Admin Account Setup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              إنشاء حساب المدير
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              إنشاء حساب مدير جديد مع كامل الصلاحيات
            </p>
            <Button
              onClick={handleSetupAdmin}
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? "جاري الإنشاء..." : "إنشاء حساب المدير"}
            </Button>
          </CardContent>
        </Card>


        {/* Force Create Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              إنشاء ملف شخصي قسري
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              إنشاء ملف شخصي للمستخدم الحالي بصلاحيات المدير
            </p>
            <Button
              onClick={handleForceCreateProfile}
              disabled={isCreating}
              variant="outline"
              className="w-full"
            >
              {isCreating ? "جاري الإنشاء..." : "إنشاء ملف شخصي"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Privilege Repair Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-600" />
            إصلاح الصلاحيات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            إصلاح مشاكل الصلاحيات وترقية المستخدمين الحاليين
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={handleFixHanyPrivileges}
              disabled={isCreating}
              variant="default"
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isCreating ? "جاري الإصلاح..." : "إصلاح hanyslmm@gmail.com"}
            </Button>
            
            <Button
              onClick={handleFixAdminPrivileges}
              disabled={isCreating}
              variant="outline"
              className="w-full"
            >
              {isCreating ? "جاري الإصلاح..." : "إصلاح صلاحيات المدراء"}
            </Button>
            
            <Button
              onClick={handleUpgradeAllUsers}
              disabled={isCreating}
              variant="outline"
              className="w-full"
            >
              {isCreating ? "جاري الترقية..." : "ترقية جميع المستخدمين"}
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 mt-4">
            <p>• إصلاح hanyslmm@gmail.com: يمنح صلاحيات المدير لحساب hanyslmm@gmail.com فقط</p>
            <p>• إصلاح صلاحيات المدراء: يمنح صلاحيات المدير لـ admin@admin.com و hanyslmm@gmail.com</p>
            <p>• ترقية جميع المستخدمين: يمنح صلاحيات المدير لجميع المستخدمين الحاليين</p>
          </div>
        </CardContent>
      </Card>

      {/* Existing Users Display */}
      {existingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600" />
              المستخدمون الحاليون ({existingUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {existingUsers.map((user, index) => (
                <div key={index} className="flex justify-between items-center p-2 border rounded">
                  <span className="font-medium">{user.email}</span>
                  <div className="text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.user_role === 'owner' || user.user_role === 'manager'
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.user_role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">معلومات التشخيص</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500">{debugInfo}</p>
          <Button
            onClick={handleTestLogin}
            disabled={isCreating}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            اختبار تسجيل الدخول
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSetup;
