import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Settings, Bell, Users, BarChart3, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    { icon: <Download className="w-4 h-4" />, label: "Export Report", variant: "default" as const },
    { icon: <FileText className="w-4 h-4" />, label: "View Logs", variant: "outline" as const },
    { icon: <Settings className="w-4 h-4" />, label: "Settings", variant: "outline" as const },
    { icon: <Bell className="w-4 h-4" />, label: "Alerts", variant: "outline" as const },
    { icon: <Users className="w-4 h-4" />, label: "Manage Team", variant: "outline" as const },
    { icon: <BarChart3 className="w-4 h-4" />, label: "Analytics", variant: "outline" as const },
    { 
      icon: <Brain className="w-4 h-4" />, 
      label: "Training", 
      variant: "outline" as const,
      onClick: () => navigate("/training")
    },
  ];

  return (
    <Card className="border-border shadow-lg">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-foreground">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant}
              className="w-full justify-start gap-2 h-auto py-3"
              onClick={action.onClick}
            >
              {action.icon}
              <span className="text-sm">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
