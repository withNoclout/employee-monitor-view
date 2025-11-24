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
}

export const EmployeeCard = ({
  id,
  name,
  position,
  performanceScore,
  status,
  lastActive,
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

  return (
    <Card className="overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 border-border group">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-[gradient_3s_ease_infinite]" />
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center shadow-lg">
                <User className="w-7 h-7 text-white" />
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${
                status === "excellent" ? "bg-success" : status === "good" ? "bg-warning" : "bg-danger"
              } animate-pulse`} />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground text-lg">{name}</h3>
              <p className="text-sm text-muted-foreground">{position}</p>
            </div>
          </div>
          <Badge className={`${getStatusColor()} shadow-sm`}>{getStatusText()}</Badge>
        </div>

        <div className="space-y-4 mb-5">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Performance Score</span>
            <span className="font-bold text-foreground text-lg">{performanceScore}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-3 shadow-inner overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 relative ${
                status === "excellent"
                  ? "gradient-success"
                  : status === "good"
                  ? "gradient-warning"
                  : "gradient-danger"
              }`}
              style={{ width: `${performanceScore}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse-slow" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-muted/50 rounded-lg p-2.5">
              <p className="text-xs text-muted-foreground mb-1">Tasks Done</p>
              <p className="font-semibold text-foreground">8/10</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2.5">
              <p className="text-xs text-muted-foreground mb-1">Hours</p>
              <p className="font-semibold text-foreground">6.5h</p>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Last active: {lastActive}
          </p>
        </div>

        <Button
          onClick={() => navigate(`/monitor/${id}`)}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
        >
          <Video className="w-4 h-4 mr-2" />
          View Live Camera
        </Button>
      </CardContent>
    </Card>
  );
};
