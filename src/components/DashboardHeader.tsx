import { Activity, Users, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
}

const StatCard = ({ icon, label, value, trend }: StatCardProps) => (
  <Card className="border-border">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className="text-xs text-success mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

export const DashboardHeader = () => {
  return (
    <div className="mb-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Employee Monitoring Dashboard
        </h1>
        <p className="text-muted-foreground">
          Real-time overview of employee performance and compliance monitoring
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={<Users className="w-6 h-6 text-primary" />}
          label="Active Employees"
          value="12"
          trend="+2 this week"
        />
        <StatCard
          icon={<Activity className="w-6 h-6 text-primary" />}
          label="Average Performance"
          value="87%"
          trend="+5% from last week"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6 text-primary" />}
          label="Compliance Rate"
          value="94%"
          trend="+3% improvement"
        />
      </div>
    </div>
  );
};
