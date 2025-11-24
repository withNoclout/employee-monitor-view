import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export const PerformanceChart = () => {
  const weekData = [
    { day: "Mon", performance: 85, height: "60%" },
    { day: "Tue", performance: 92, height: "75%" },
    { day: "Wed", performance: 88, height: "65%" },
    { day: "Thu", performance: 95, height: "85%" },
    { day: "Fri", performance: 90, height: "70%" },
    { day: "Sat", performance: 87, height: "62%" },
    { day: "Sun", performance: 94, height: "80%" },
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
        <div className="flex items-end justify-between gap-3 h-48">
          {weekData.map((day, index) => (
            <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center justify-end flex-1">
                <div className="text-xs font-medium text-foreground mb-1">
                  {day.performance}%
                </div>
                <div
                  className="w-full gradient-primary rounded-t-lg transition-all hover:opacity-80 relative overflow-hidden"
                  style={{ height: day.height }}
                >
                  <div className="absolute inset-0 bg-white/10 animate-pulse-slow" />
                </div>
              </div>
              <span className="text-xs text-muted-foreground font-medium">{day.day}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
