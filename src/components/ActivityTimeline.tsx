import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle, AlertCircle, Info } from "lucide-react";

interface ActivityItem {
  time: string;
  title: string;
  type: "success" | "warning" | "info";
  icon: React.ReactNode;
}

export const ActivityTimeline = () => {
  const activities: ActivityItem[] = [
    {
      time: "2 mins ago",
      title: "Sarah Johnson completed task #247",
      type: "success",
      icon: <CheckCircle className="w-4 h-4" />,
    },
    {
      time: "5 mins ago",
      title: "Michael Chen logged in",
      type: "info",
      icon: <Info className="w-4 h-4" />,
    },
    {
      time: "8 mins ago",
      title: "James Brown - Compliance alert",
      type: "warning",
      icon: <AlertCircle className="w-4 h-4" />,
    },
    {
      time: "12 mins ago",
      title: "Emma Williams completed task #246",
      type: "success",
      icon: <CheckCircle className="w-4 h-4" />,
    },
    {
      time: "15 mins ago",
      title: "Lisa Anderson logged in",
      type: "info",
      icon: <Info className="w-4 h-4" />,
    },
  ];

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
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start gap-3 group hover:bg-muted/30 p-2 rounded-lg transition-colors">
              <div className={`p-2 rounded-full ${getActivityColor(activity.type)} transition-transform group-hover:scale-110`}>
                {activity.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{activity.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
