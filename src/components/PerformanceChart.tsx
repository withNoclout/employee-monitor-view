import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export const PerformanceChart = () => {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const weekData = [
    { day: "Mon", performance: 65, tasks: 142, hours: 1245, efficiency: 78 },
    { day: "Tue", performance: 78, tasks: 168, hours: 1320, efficiency: 85 },
    { day: "Wed", performance: 72, tasks: 156, hours: 1280, efficiency: 82 },
    { day: "Thu", performance: 85, tasks: 185, hours: 1398, efficiency: 91 },
    { day: "Fri", performance: 92, tasks: 198, hours: 1445, efficiency: 95 },
    { day: "Sat", performance: 88, tasks: 189, hours: 1410, efficiency: 93 },
    { day: "Sun", performance: 98, tasks: 210, hours: 1520, efficiency: 98 },
  ];

  return (
    <Card className="border-border shadow-industrial hover:shadow-industrial-lg transition-all duration-300">
      <CardHeader className="border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground font-bold tracking-tight">Weekly Performance Trend</CardTitle>
          <div className="flex items-center gap-2 text-success text-sm font-semibold">
            <TrendingUp className="w-4 h-4" />
            <span>+8.5%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-stretch justify-between gap-4 h-80 relative">
          {weekData.map((day, index) => (
            <div 
              key={day.day} 
              className="flex-1 flex flex-col items-center gap-3 relative"
              onMouseEnter={() => setHoveredBar(index)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {/* Tooltip */}
              {hoveredBar === index && (
                <div className="absolute -top-32 left-1/2 -translate-x-1/2 z-10 w-48 bg-card border-2 border-primary shadow-industrial-lg rounded-lg p-3 animate-fade-in-up">
                  <div className="space-y-2">
                    <div className="text-center border-b border-border/50 pb-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase">{day.day}</p>
                      <p className="text-2xl font-bold text-primary font-mono">{day.performance}%</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Tasks Completed:</span>
                        <span className="text-foreground font-semibold font-mono">{day.tasks}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Total Hours:</span>
                        <span className="text-foreground font-semibold font-mono">{day.hours}h</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Efficiency:</span>
                        <span className="text-foreground font-semibold font-mono">{day.efficiency}%</span>
                      </div>
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card border-r-2 border-b-2 border-primary rotate-45" />
                </div>
              )}

              <div className="w-full flex flex-col items-center justify-end flex-1 relative group">
                {/* Performance label */}
                <div className={`text-sm font-bold mb-2 transition-all duration-300 font-mono ${
                  hoveredBar === index ? "text-primary scale-110" : "text-foreground"
                }`}>
                  {day.performance}%
                </div>
                
                {/* Bar */}
                <div
                  className={`w-full gradient-primary rounded-t-lg relative overflow-hidden cursor-pointer transition-all duration-300 ${
                    hoveredBar === index ? "shadow-glow scale-105" : ""
                  }`}
                  style={{
                    height: `${day.performance}%`,
                    animation: `grow-up 0.8s ease-out forwards`,
                    animationDelay: `${index * 100}ms`,
                    opacity: 0
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />
                  {hoveredBar === index && (
                    <div className="absolute inset-0 bg-white/20 animate-pulse-slow" />
                  )}
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
              
              {/* Day label */}
              <span className={`text-xs font-semibold transition-colors duration-300 ${
                hoveredBar === index ? "text-primary" : "text-muted-foreground"
              }`}>
                {day.day}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
