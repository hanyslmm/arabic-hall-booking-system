
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { HallScheduleModal } from "@/components/hall/HallScheduleModal";
import { useAuth } from "@/hooks/useAuth";
import { getHalls } from "@/api/halls";

interface Hall {
  id: string;
  name: string;
  capacity: number;
}

interface OccupancyData {
  hall_id: string;
  name: string;
  occupancy_percentage: number;
}

interface HallsGridProps {
  occupancyData?: OccupancyData[];
}

export const HallsGrid = ({ occupancyData }: HallsGridProps) => {
  const [selectedHall, setSelectedHall] = useState<{ id: string; name: string } | null>(null);
  const { user } = useAuth();

  const { data: halls, isLoading, error } = useQuery({
    queryKey: ['halls'],
    queryFn: getHalls,
    enabled: !!user,
    staleTime: 30_000,
  });

  const getCapacityVariant = (capacity: number) => {
    if (capacity >= 70) return 'capacity-high';
    if (capacity >= 40) return 'capacity-medium';
    return 'capacity-low';
  };

  const getCapacityLabel = (capacity: number) => {
    if (capacity >= 70) return 'سعة كبيرة';
    if (capacity >= 40) return 'سعة متوسطة';
    return 'سعة صغيرة';
  };

  const getOccupancyForHall = (hallId: string): number => {
    const hallOccupancy = occupancyData?.find(item => item.hall_id === hallId);
    return hallOccupancy?.occupancy_percentage || 0;
  };

  const getOccupancyColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-red-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleHallClick = (hall: Hall) => {
    setSelectedHall({ id: hall.id, name: hall.name });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i} className="card-elevated">
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-4 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">حدث خطأ في تحميل القاعات. يرجى تسجيل الدخول مرة أخرى إذا استمر الخطأ.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">القاعات المتاحة</h2>
          <Badge variant="outline" className="text-muted-foreground">
            {halls?.length} قاعة
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {halls?.map((hall) => (
            <Card 
              key={hall.id} 
              className="card-elevated hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleHallClick(hall)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{hall.name}</span>
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">السعة:</span>
                    <span className="font-semibold text-primary">{hall.capacity} طالب</span>
                  </div>
                  
                    <div className={`capacity-indicator ${getCapacityVariant(hall.capacity)}`}>
                      {getCapacityLabel(hall.capacity)}
                    </div>

                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">نسبة الاشغال:</span>
                      <span className={`font-semibold ${getOccupancyColor(getOccupancyForHall(hall.id))}`}>
                        {getOccupancyForHall(hall.id)}%
                      </span>
                    </div>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    انقر لعرض الجدول الأسبوعي
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <HallScheduleModal
        hallId={selectedHall?.id || null}
        hallName={selectedHall?.name || ""}
        isOpen={!!selectedHall}
        onClose={() => setSelectedHall(null)}
      />
    </>
  );
};
