import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle, AlertCircle, Info, Calendar, ClipboardList } from "lucide-react";
import { useActivityLog } from "@/hooks/useActivityLog";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  time: string;
  title: string;
  type: "success" | "warning" | "info";
  icon: React.ReactNode;
}

export const ActivityTimeline = () => {
  const { activities } = useActivityLog();

  const getActivityIcon = (type: string, taskType?: string) => {
    if (taskType === 'daily') return <ClipboardList className="w-4 h-4" />;
    if (taskType === 'monthly') return <Calendar className="w-4 h-4" />;

    switch (type) {
      case "success": return <CheckCircle className="w-4 h-4" />;
      case "warning": return <AlertCircle className="w-4 h-4" />;
      case "info": return <Info className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-success bg-success/10";
      case "warning":
        return "text-warning bg-warning/10";
      case "info":
        return "text-primary bg-primary/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  return (
    <Card className="border-border shadow-lg">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 group hover:bg-muted/30 p-2 rounded-lg transition-colors">
                <div className={`p-2 rounded-full ${getActivityColor(activity.type)} transition-transform group-hover:scale-110`}>
                  {getActivityIcon(activity.type, activity.taskType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{activity.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
