
import { useState } from "react";
import { BookingForm } from "@/components/booking/BookingForm";
import { AddTeacherModal } from "@/components/teacher/AddTeacherModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { UnifiedLayout } from "@/components/layout/UnifiedLayout";
import { useAuth } from "@/hooks/useAuth";

const BookingPage = () => {
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const { profile } = useAuth();

  return (
    <UnifiedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary">حجز قاعة جديد</h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              قم بملء النموذج أدناه لحجز قاعة
            </p>
          </div>
          
          <Button
            onClick={() => setShowAddTeacher(true)}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            إضافة معلم جديد
          </Button>
        </div>

        <BookingForm />
        
        <AddTeacherModal 
          isOpen={showAddTeacher}
          onClose={() => setShowAddTeacher(false)}
        />
      </div>
    </UnifiedLayout>
  );
};

export default BookingPage;
