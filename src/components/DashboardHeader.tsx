import { Activity, Users, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
}

const StatCard = ({ icon, label, value, trend }: StatCardProps) => (
  <Card className="border-border shadow-lg hover:shadow-xl transition-all overflow-hidden group">
    <div className="absolute inset-0 gradient-primary opacity-0 group-hover:opacity-5 transition-opacity" />
    <CardContent className="p-6 relative">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
          <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
          {trend && (
            <p className="text-sm text-success font-medium flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              {trend}
            </p>
          )}
        </div>
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <div className="text-white">
            {icon}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const DashboardHeader = () => {
  return (
    <div className="mb-10">
      <div className="mb-8 relative">
        <div className="absolute inset-0 gradient-primary opacity-5 blur-3xl -z-10" />
        <h1 className="text-4xl font-bold text-foreground mb-3 flex items-center gap-3">
          <Activity className="w-10 h-10 text-primary" />
          Employee Monitoring Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">
          Real-time overview of employee performance and compliance monitoring
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={<Users className="w-8 h-8" />}
          label="Active Employees"
          value="12"
          trend="+2 this week"
        />
        <StatCard
          icon={<Activity className="w-8 h-8" />}
          label="Average Performance"
          value="87%"
          trend="+5% from last week"
        />
        <StatCard
          icon={<TrendingUp className="w-8 h-8" />}
          label="Compliance Rate"
          value="94%"
          trend="+3% improvement"
        />
      </div>
    </div>
  );
};
