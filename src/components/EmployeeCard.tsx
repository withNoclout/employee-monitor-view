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
    <Card className="overflow-hidden transition-all hover:shadow-lg border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground">{name}</h3>
              <p className="text-sm text-muted-foreground">{position}</p>
            </div>
          </div>
          <Badge className={getStatusColor()}>{getStatusText()}</Badge>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Performance Score</span>
            <span className="font-semibold text-foreground">{performanceScore}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                status === "excellent"
                  ? "bg-success"
                  : status === "good"
                  ? "bg-warning"
                  : "bg-danger"
              }`}
              style={{ width: `${performanceScore}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Last active: {lastActive}</p>
        </div>

        <Button
          onClick={() => navigate(`/monitor/${id}`)}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Video className="w-4 h-4 mr-2" />
          View Camera
        </Button>
      </CardContent>
    </Card>
  );
};
