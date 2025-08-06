import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export const StyleShowcase = () => {
  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4 animate-fade-in-up">
        <h1 className="text-gradient-hero">نظام التصميم المحسن</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          تجربة مرئية محسنة مع ألوان حديثة وانتقالات سلسة وتصميم متجاوب
        </p>
      </div>

      {/* Button Showcase */}
      <Card variant="elevated" className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <CardHeader>
          <CardTitle>الأزرار المحسنة</CardTitle>
          <CardDescription>مجموعة متنوعة من أنماط الأزرار مع تأثيرات تفاعلية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Button variant="default">افتراضي</Button>
            <Button variant="hero">بطولي</Button>
            <Button variant="success">نجاح</Button>
            <Button variant="warning">تحذير</Button>
            <Button variant="info">معلومات</Button>
            <Button variant="glass">زجاجي</Button>
            <Button variant="gradient">متدرج</Button>
            <Button variant="outline">محدد</Button>
          </div>
        </CardContent>
      </Card>

      {/* Card Variants */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card variant="default" className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle>بطاقة افتراضية</CardTitle>
            <CardDescription>التصميم الأساسي للبطاقات</CardDescription>
          </CardHeader>
          <CardContent>
            <p>محتوى البطاقة مع تصميم بسيط وأنيق</p>
          </CardContent>
        </Card>

        <Card variant="elevated" className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <CardHeader>
            <CardTitle>بطاقة مرتفعة</CardTitle>
            <CardDescription>مع ظل أكثر وضوحاً</CardDescription>
          </CardHeader>
          <CardContent>
            <p>تأثير ارتفاع عند التمرير للتفاعل الأمثل</p>
          </CardContent>
        </Card>

        <Card variant="hero" className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle>بطاقة بطولية</CardTitle>
            <CardDescription>للمحتوى المهم</CardDescription>
          </CardHeader>
          <CardContent>
            <p>تأثيرات بصرية محسنة مع تكبير طفيف</p>
          </CardContent>
        </Card>
      </div>

      {/* Badge Showcase */}
      <Card variant="glass" className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
        <CardHeader>
          <CardTitle>الشارات المحسنة</CardTitle>
          <CardDescription>شارات متنوعة للحالات المختلفة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant="default">افتراضي</Badge>
            <Badge variant="success">نجح</Badge>
            <Badge variant="warning">تحذير</Badge>
            <Badge variant="info">معلومات</Badge>
            <Badge variant="destructive">خطر</Badge>
            <Badge variant="gradient">متدرج</Badge>
            <Badge variant="glass">زجاجي</Badge>
            <Badge variant="outline">محدد</Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Badge size="sm" variant="success">صغير</Badge>
            <Badge size="default" variant="warning">عادي</Badge>
            <Badge size="lg" variant="info">كبير</Badge>
            <Badge size="xl" variant="gradient">كبير جداً</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Input Showcase */}
      <Card variant="interactive" className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
        <CardHeader>
          <CardTitle>حقول الإدخال المحسنة</CardTitle>
          <CardDescription>مع تأثيرات التركيز المحسنة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="اسم المستخدم" />
            <Input placeholder="البريد الإلكتروني" type="email" />
            <Input placeholder="كلمة المرور" type="password" />
            <Input placeholder="رقم الهاتف" type="tel" />
          </div>
        </CardContent>
      </Card>

      {/* Loading States */}
      <Card variant="gradient" className="animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
        <CardHeader>
          <CardTitle>حالات التحميل</CardTitle>
          <CardDescription>هياكل عظمية محسنة مع تأثيرات التحميل</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 space-x-reverse">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-32 w-full rounded-lg" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography Showcase */}
      <Card variant="hero" className="animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
        <CardHeader>
          <CardTitle>التسلسل الهرمي للخطوط</CardTitle>
          <CardDescription>خطوط محسنة مع دعم أفضل للعربية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h1>عنوان رئيسي - H1</h1>
            <h2>عنوان ثانوي - H2</h2>
            <h3>عنوان فرعي - H3</h3>
            <h4>عنوان صغير - H4</h4>
            <h5>عنوان أصغر - H5</h5>
            <h6>عنوان الأصغر - H6</h6>
            <p>
              نص عادي مع تباعد أسطر محسن لقراءة أفضل. يدعم النظام اللغة العربية بشكل كامل
              مع خط Cairo المحسن والتوجه من اليمين إلى اليسار.
            </p>
            <p className="text-gradient">نص مع تدرج لوني جميل</p>
            <p className="text-gradient-hero">نص بطولي مع تدرج محسن</p>
          </div>
        </CardContent>
      </Card>

      {/* Status Indicators */}
      <Card variant="elevated" className="animate-fade-in-up" style={{ animationDelay: '0.9s' }}>
        <CardHeader>
          <CardTitle>مؤشرات الحالة</CardTitle>
          <CardDescription>مؤشرات محسنة للحالات المختلفة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">مؤشرات السعة</h4>
              <div className="space-y-2">
                <div className="capacity-indicator capacity-high">سعة عالية</div>
                <div className="capacity-indicator capacity-medium">سعة متوسطة</div>
                <div className="capacity-indicator capacity-low">سعة منخفضة</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">شارات الحالة</h4>
              <div className="space-y-2">
                <div className="status-active inline-block px-3 py-1 rounded-full text-sm">نشط</div>
                <div className="status-pending inline-block px-3 py-1 rounded-full text-sm">في الانتظار</div>
                <div className="status-cancelled inline-block px-3 py-1 rounded-full text-sm">ملغي</div>
                <div className="status-info inline-block px-3 py-1 rounded-full text-sm">معلومات</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Elements */}
      <Card variant="glass" className="animate-fade-in-up" style={{ animationDelay: '1s' }}>
        <CardHeader>
          <CardTitle>العناصر التفاعلية</CardTitle>
          <CardDescription>عناصر مع تأثيرات تفاعلية محسنة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="interactive bg-primary/10 p-4 rounded-lg text-center cursor-pointer">
              <div className="text-primary font-semibold">عنصر تفاعلي 1</div>
            </div>
            <div className="interactive bg-success/10 p-4 rounded-lg text-center cursor-pointer">
              <div className="text-success font-semibold">عنصر تفاعلي 2</div>
            </div>
            <div className="interactive bg-warning/10 p-4 rounded-lg text-center cursor-pointer">
              <div className="text-warning font-semibold">عنصر تفاعلي 3</div>
            </div>
            <div className="interactive bg-info/10 p-4 rounded-lg text-center cursor-pointer">
              <div className="text-info font-semibold">عنصر تفاعلي 4</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};