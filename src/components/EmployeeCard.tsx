import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EmployeeCardProps {
  id: string;
  name: string;
  position: string;
  performanceScore: number;
  status: "excellent" | "good" | "needs-attention";
  lastActive: string;
  completedTasks: number;
  pendingTasks: number;
  hoursWorked: number;
}

export const EmployeeCard = ({
  id,
  name,
  position,
  performanceScore,
  status,
  lastActive,
  completedTasks,
  pendingTasks,
  hoursWorked,
}: EmployeeCardProps) => {
  const navigate = useNavigate();

  const getStatusColor = () => {
    switch (status) {
      case "excellent":
        return "bg-success text-success-foreground";
      case "good":
        return "bg-warning text-warning-foreground";
      case "needs-attention":
        return "bg-danger text-danger-foreground";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "excellent":
        return "Excellent";
      case "good":
        return "Good";
      case "needs-attention":
        return "Needs Attention";
    }
  };

  const totalTasks = completedTasks + pendingTasks;

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-industrial-lg border-border group bg-card relative">
      {/* Tech accent line */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Status indicator bar */}
      <div className={`h-1 ${status === "excellent" ? "gradient-success" :
          status === "good" ? "gradient-warning" :
            "gradient-danger"
        }`} />

      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-xl gradient-industrial flex items-center justify-center shadow-industrial relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/10" />
                <User className="w-8 h-8 text-white relative z-10" />
              </div>
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-card ${status === "excellent" ? "bg-success" : status === "good" ? "bg-warning" : "bg-danger"
                } shadow-glow`} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg mb-0.5">{name}</h3>
              <p className="text-sm text-muted-foreground font-medium">{position}</p>
            </div>
          </div>
          <Badge className={`${getStatusColor()} shadow-sm font-medium px-3 py-1`}>
            {getStatusText()}
          </Badge>
        </div>

        <div className="space-y-4 mb-6">
          {/* Performance Score */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Performance</span>
              <span className="font-bold text-foreground text-xl font-mono">{performanceScore}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 shadow-inner overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-700 ease-out relative ${status === "excellent"
                    ? "gradient-success"
                    : status === "good"
                      ? "gradient-warning"
                      : "gradient-danger"
                  }`}
                style={{ width: `${performanceScore}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse-slow" />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/20 rounded-lg p-3 border border-border/30 hover:border-primary/30 transition-colors">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1.5">Tasks</p>
              <p className="font-bold text-foreground text-lg font-mono">{completedTasks}/{totalTasks}</p>
            </div>
            <div className="bg-muted/20 rounded-lg p-3 border border-border/30 hover:border-primary/30 transition-colors">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1.5">Hours</p>
              <p className="font-bold text-foreground text-lg font-mono">{hoursWorked}h</p>
            </div>
          </div>

          {/* Last Active */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <div className="relative flex items-center">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span className="absolute w-2 h-2 rounded-full bg-success animate-ping" />
            </div>
            <span>Last active: <span className="text-foreground font-semibold">{lastActive}</span></span>
          </div>
        </div>

        <Button
          onClick={() => navigate(`/monitor/${id}`)}
          className="w-full gradient-primary text-primary-foreground shadow-industrial hover:shadow-industrial-lg transition-all duration-300 font-semibold h-11 group/btn relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-700" />
          <Video className="w-4 h-4 mr-2 relative z-10" />
          <span className="relative z-10">View Live Camera</span>
        </Button>
      </CardContent>
    </Card>
  );
};
