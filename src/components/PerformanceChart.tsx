import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export const PerformanceChart = () => {
  const weekData = [
    { day: "Mon", performance: 65, height: "45%" },
    { day: "Tue", performance: 78, height: "58%" },
    { day: "Wed", performance: 72, height: "52%" },
    { day: "Thu", performance: 85, height: "70%" },
    { day: "Fri", performance: 92, height: "85%" },
    { day: "Sat", performance: 88, height: "78%" },
    { day: "Sun", performance: 98, height: "95%" },
  ];

  return (
    <Card className="border-border shadow-lg">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">Weekly Performance Trend</CardTitle>
          <div className="flex items-center gap-2 text-success text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            <span>+8.5%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-stretch justify-between gap-3 h-48">
          {weekData.map((day, index) => (
            <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center justify-end flex-1">
                <div className="text-xs font-medium text-foreground mb-1">
                  {day.performance}%
                </div>
                <div
                  className="w-full gradient-primary rounded-t-lg relative overflow-hidden"
                  style={{
                    height: day.height,
                    animation: `grow-up 1s ease-out forwards`,
                    animationDelay: `${index * 150}ms`,
                    opacity: 0 // Start hidden
                  }}
                >
                  <div className="absolute inset-0 bg-white/10 animate-pulse-slow" />
                </div>
                <style>{`
                  @keyframes grow-up {
                    from {
                      height: 0;
                      opacity: 0;
                    }
                    to {
                      opacity: 1;
                    }
                  }
                `}</style>
              </div>
              <span className="text-xs text-muted-foreground font-medium">{day.day}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
