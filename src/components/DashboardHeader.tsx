import { Activity, Users, TrendingUp, LogOut } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  trend?: string;
}

const StatCard = ({ icon, label, value, trend }: StatCardProps) => (
  <Card className="border-border shadow-industrial hover:shadow-industrial-lg transition-all duration-300 overflow-hidden group relative bg-card">
    {/* Hover effect background */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    
    <CardContent className="p-6 relative">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{label}</p>
          <div className="text-3xl font-bold text-foreground mb-2 font-mono tracking-tight">{value}</div>
          {trend && (
            <p className="text-sm text-success font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {trend}
            </p>
          )}
        </div>
        <div className="w-16 h-16 rounded-xl gradient-industrial flex items-center justify-center shadow-industrial group-hover:scale-110 transition-transform duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/20 group-hover:from-primary/40 group-hover:to-accent/30 transition-colors duration-300" />
          <div className="text-white relative z-10">
            {icon}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export interface DashboardStats {
  activeEmployees: {
    value: number;
    trend: string;
    trendDirection: 'up' | 'down';
  };
  avgPerformance: {
    value: number;
    trend: string;
  };
  complianceRate: {
    value: number;
    trend: string;
  };
}

interface DashboardHeaderProps {
  stats?: DashboardStats;
}

export const DashboardHeader = ({ stats }: DashboardHeaderProps) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Default fallback values if no stats provided
  const defaultStats = {
    activeEmployees: { value: 12, trend: "+2 this week", trendDirection: 'up' as const },
    avgPerformance: { value: 87, trend: "+5% from last week" },
    complianceRate: { value: 94, trend: "+3% improvement" }
  };

  const currentStats = stats || defaultStats;

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate("/login");
  };

  return (
    <div className="mb-12">
      <div className="mb-10 relative">
        {/* Professional background effect */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="absolute inset-0 bg-industrial-grid opacity-20" />
        </div>
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg gradient-primary shadow-industrial flex items-center justify-center">
                <img src="/logo.svg" alt="NextXO Logo" className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-foreground tracking-tight">
                  NextXO Employee Monitor
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1 w-1 rounded-full bg-success animate-pulse" />
                  <span className="text-sm text-muted-foreground font-medium">System Online</span>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-base max-w-2xl leading-relaxed border-l-2 border-primary/30 pl-4">
              Real-time overview of employee performance and compliance monitoring with advanced AI-powered analytics
            </p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all shadow-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={<Users className="w-8 h-8" />}
          label="Active Employees"
          value={
            <AnimatedNumber
              value={currentStats.activeEmployees.value}
              format={(v) => Math.round(v).toString()}
            />
          }
          trend={currentStats.activeEmployees.trend}
        />
        <StatCard
          icon={<Activity className="w-8 h-8" />}
          label="Average Performance"
          value={
            <AnimatedNumber
              value={currentStats.avgPerformance.value}
              format={(v) => `${v.toFixed(1)}%`}
            />
          }
          trend={currentStats.avgPerformance.trend}
        />
        <StatCard
          icon={<TrendingUp className="w-8 h-8" />}
          label="Compliance Rate"
          value={
            <AnimatedNumber
              value={currentStats.complianceRate.value}
              format={(v) => `${v.toFixed(2)}%`}
            />
          }
          trend={currentStats.complianceRate.trend}
        />
      </div>
    </div>
  );
};
