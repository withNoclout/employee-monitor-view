import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Database, Wifi, Shield } from "lucide-react";

interface StatusItem {
  label: string;
  status: "operational" | "degraded" | "offline";
  icon: React.ReactNode;
  uptime: string;
}

export const SystemStatus = () => {
  const systems: StatusItem[] = [
    {
      label: "Camera Servers",
      status: "operational",
      icon: <Server className="w-4 h-4" />,
      uptime: "99.9%",
    },
    {
      label: "Database",
      status: "operational",
      icon: <Database className="w-4 h-4" />,
      uptime: "100%",
    },
    {
      label: "Network",
      status: "operational",
      icon: <Wifi className="w-4 h-4" />,
      uptime: "99.8%",
    },
    {
      label: "Security",
      status: "operational",
      icon: <Shield className="w-4 h-4" />,
      uptime: "100%",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return <Badge className="bg-success text-success-foreground">Operational</Badge>;
      case "degraded":
        return <Badge className="bg-warning text-warning-foreground">Degraded</Badge>;
      case "offline":
        return <Badge className="bg-danger text-danger-foreground">Offline</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="border-border shadow-lg">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-foreground">System Status</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {systems.map((system, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {system.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{system.label}</p>
                  <p className="text-xs text-muted-foreground">Uptime: {system.uptime}</p>
                </div>
              </div>
              {getStatusBadge(system.status)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
