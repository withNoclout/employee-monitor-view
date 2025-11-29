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
        return <Badge className="bg-success text-success-foreground shadow-sm font-medium">Operational</Badge>;
      case "degraded":
        return <Badge className="bg-warning text-warning-foreground shadow-sm font-medium">Degraded</Badge>;
      case "offline":
        return <Badge className="bg-danger text-danger-foreground shadow-sm font-medium">Offline</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="border-border shadow-industrial hover:shadow-industrial-lg transition-all duration-300 h-full flex flex-col">
      <CardHeader className="border-b border-border/50 bg-muted/20">
        <CardTitle className="text-foreground font-bold tracking-tight">System Status</CardTitle>
      </CardHeader>
      <CardContent className="p-6 flex-1 flex flex-col">
        <div className="flex flex-col justify-between h-full space-y-4">
          {systems.map((system, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-all duration-300 border border-border/30 group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-primary/10 to-accent/5 text-primary group-hover:scale-110 transition-transform duration-300">
                  {system.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{system.label}</p>
                  <p className="text-xs text-muted-foreground font-medium">Uptime: <span className="font-mono font-semibold text-foreground">{system.uptime}</span></p>
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
