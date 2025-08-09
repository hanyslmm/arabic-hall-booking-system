# إصلاح مشكلة إدارة الحجوزات - Science Club

## المشكلة
عند محاولة فتح "إدارة الحجوزات" يظهر خطأ "خطأ في تحميل البيانات" مع رسالة "يرجى المحاولة مرة أخرى".

## الأسباب المحتملة

### 1. مشاكل المصادقة (Authentication)
- المستخدم غير مسجل دخول بشكل صحيح
- انتهت صلاحية جلسة المستخدم
- مشكلة في اتصال Supabase

### 2. مشاكل الصلاحيات (RLS Policies)
- المستخدم لا يملك دور (user_role) محدد في جدول profiles
- دور المستخدم لا يسمح بقراءة جدول bookings
- مشكلة في دوال RLS (can_read, is_admin_user)

### 3. مشاكل قاعدة البيانات
- اتصال قاعدة البيانات معطل
- مشكلة في جدول bookings
- مشكلة في العلاقات بين الجداول

## خطوات التشخيص

### الخطوة 1: استخدام صفحة التشخيص
1. اذهب إلى `/diagnostics` في المتصفح
2. ستظهر لك معلومات شاملة عن:
   - حالة الاتصال بقاعدة البيانات
   - حالة المصادقة
   - صلاحيات المستخدم
   - إمكانية الوصول لجدول الحجوزات

### الخطوة 2: فحص وحة المطور (Developer Console)
1. اضغط F12 لفتح وحة المطور
2. اذهب إلى تبويب Console
3. ابحث عن رسائل الخطأ التي تبدأ بـ:
   - `❌ Session error:`
   - `❌ No authenticated user found`
   - `❌ Bookings query error:`

### الخطوة 3: فحص قاعدة البيانات
استخدم الملف `fix_user_roles.sql` لفحص وإصلاح مشاكل الأدوار:

```sql
-- فحص الملفات الشخصية والأدوار
SELECT 
    u.id,
    u.email,
    p.full_name,
    p.user_role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;
```

## الحلول

### الحل 1: إصلاح أدوار المستخدمين
إذا كان المستخدم لا يملك دور محدد:

```sql
-- تحديث جميع المستخدمين ليصبحوا مالكين (وصول كامل)
UPDATE public.profiles 
SET user_role = 'owner'::user_role 
WHERE user_role IS NULL OR user_role != 'owner';
```

### الحل 2: إنشاء ملفات شخصية مفقودة
إذا كان هناك مستخدمون بدون ملفات شخصية:

```sql
-- إنشاء ملفات شخصية للمستخدمين المفقودين
INSERT INTO public.profiles (id, user_role, full_name, username)
SELECT 
    u.id,
    'owner'::user_role,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email),
    COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;
```

### الحل 3: إعادة تسجيل الدخول
1. اذهب إلى `/login`
2. سجل خروج ثم ادخل مرة أخرى
3. تأكد من صحة البيانات

### الحل 4: فحص متغيرات البيئة
تأكد من أن ملف `.env` يحتوي على:

```env
VITE_SUPABASE_URL=https://lhklufuwbtjexsehlvtj.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## اختبار الحل

بعد تطبيق أي حل:

1. **اختبر صفحة التشخيص**: اذهب إلى `/diagnostics` وتأكد من أن جميع الاختبارات تظهر ✅
2. **اختبر إدارة الحجوزات**: اذهب إلى `/bookings` وتأكد من تحميل البيانات
3. **فحص وحة المطور**: تأكد من عدم وجود أخطاء في console

## الأدوار المتاحة

| الدور | الوصف | الصلاحيات |
|-------|--------|-----------|
| `owner` | مالك النظام | وصول كامل لجميع الوظائف |
| `manager` | مدير | وصول كامل لجميع الوظائف |
| `space_manager` | مدير قاعات | قراءة فقط |
| `read_only` | قراءة فقط | قراءة فقط |

## RLS Policies المطبقة

### جدول bookings
- **القراءة**: `can_read()` - أي مستخدم مصادق عليه
- **الكتابة**: `is_admin_user()` - فقط owner و manager

### دوال RLS
```sql
-- دالة فحص إمكانية القراءة
CREATE OR REPLACE FUNCTION public.can_read()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة فحص صلاحيات الإدارة
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND user_role IN ('owner', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## طلب المساعدة

إذا لم تنجح الحلول المذكورة:

1. شغل صفحة التشخيص `/diagnostics`
2. انسخ نتائج جميع الاختبارات
3. انسخ أي رسائل خطأ من وحة المطور
4. شارك هذه المعلومات مع فريق الدعم

## ملاحظات مهمة

- ⚠️ **تحذير**: تغيير أدوار المستخدمين قد يؤثر على أمان النظام
- 🔒 **أمان**: تأكد من إعطاء دور `owner` فقط للمستخدمين الموثوقين
- 📝 **سجل**: احتفظ بنسخة احتياطية قبل تطبيق أي تغييرات على قاعدة البيانات