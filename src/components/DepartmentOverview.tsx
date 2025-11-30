import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Factory, Package, Wrench, ShieldCheck, Truck, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface Department {
  id: string;
  name: string;
  icon: React.ReactNode;
  totalEmployees: number;
  attentionEmployees: number;
  attentionRatio: number;
  avgPerformance: number;
  status: "excellent" | "good" | "needs-attention";
  color: string;
}

interface DepartmentOverviewProps {
  onDepartmentClick: (departmentId: string) => void;
  employees: any[];
  highlightedDeptId?: string | null;
  onSelectEmployee?: (employeeId: string) => void; // Optional now
}

export const DepartmentOverview = ({ onDepartmentClick, employees, highlightedDeptId }: DepartmentOverviewProps) => {
  const calculateDeptStats = (deptId: string) => {
    const deptEmployees = employees.filter(e => e.department === deptId);
    const total = deptEmployees.length;
    // Count "Attention" employees (Badge = needs-attention)
    const attentionCount = deptEmployees.filter(e => e.status === 'needs-attention').length;
    const attentionRatio = total > 0 ? attentionCount / total : 0;

    const avgPerformance = total > 0
      ? Math.round(deptEmployees.reduce((acc, curr) => acc + curr.performanceScore, 0) / total)
      : 0;

    let status: "excellent" | "good" | "needs-attention" = "good";
    if (avgPerformance >= 90) status = "excellent";
    else if (avgPerformance < 75) status = "needs-attention";

    return { totalEmployees: total, attentionEmployees: attentionCount, attentionRatio, avgPerformance, status };
  };

  const departments: Department[] = [
    {
      id: "production",
      name: "Production Floor",
      icon: <Factory className="w-8 h-8" />,
      color: "primary",
    },
    {
      id: "assembly",
      name: "Assembly Line",
      icon: <Package className="w-8 h-8" />,
      color: "primary",
    },
    {
      id: "maintenance",
      name: "Maintenance",
      icon: <Wrench className="w-8 h-8" />,
      color: "primary",
    },
    {
      id: "quality",
      name: "Quality Control",
      icon: <ShieldCheck className="w-8 h-8" />,
      color: "primary",
    },
    {
      id: "logistics",
      name: "Logistics",
      icon: <Truck className="w-8 h-8" />,
      color: "primary",
    },
    {
      id: "workforce",
      name: "General Workforce",
      icon: <Users className="w-8 h-8" />,
      color: "primary",
    },
  ].map(d => ({
    ...d,
    ...calculateDeptStats(d.id)
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "bg-success text-success-foreground";
      case "good":
        return "bg-warning text-warning-foreground";
      case "needs-attention":
        return "bg-danger text-danger-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "excellent":
        return "Excellent";
      case "good":
        return "Good";
      case "needs-attention":
        return "Attention Required";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept, index) => {
          const isHighlighted = highlightedDeptId === dept.id;

          return (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: isHighlighted ? 1.02 : 1,
                boxShadow: isHighlighted ? "0 0 20px rgba(255, 255, 255, 0.3)" : "none"
              }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-industrial-lg border-border/50 group bg-card relative shadow-industrial ${isHighlighted ? "ring-2 ring-white ring-offset-2 ring-offset-background" : ""
                  }`}
                onClick={() => onDepartmentClick(dept.id)}
              >
                {/* Highlight Overlay */}
                {isHighlighted && (
                  <div className="absolute inset-0 bg-white/5 pointer-events-none z-10 animate-pulse" />
                )}

                {/* Subtle accent border */}
                <div className="h-[2px] bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30" />

                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-lg border-2 border-border/50 bg-muted/30 backdrop-blur-sm flex items-center justify-center shadow-industrial group-hover:border-primary/50 group-hover:bg-primary/5 transition-all duration-300 shrink-0">
                        <div className="text-primary group-hover:scale-110 transition-transform duration-300">
                          {dept.icon}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-bold text-foreground text-lg mb-1.5 tracking-tight truncate">
                          {dept.name}
                        </h3>
                        <Badge className={`${getStatusColor(dept.status)} shadow-sm font-semibold text-[10px] uppercase tracking-wider px-2`}>
                          {getStatusText(dept.status)}
                        </Badge>
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>

                  {/* Stats Grid */}
                  <div className="space-y-3.5">
                    {/* Attention Employees (Low Performance) */}
                    <div className="glass-effect rounded-md p-3.5 border border-border/40 shadow-sm">
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                          Attention Employees
                        </span>
                        <span className="text-sm font-bold text-foreground font-mono tabular-nums">
                          {dept.attentionEmployees}/{dept.totalEmployees}
                        </span>
                      </div>
                      <div className="w-full bg-muted/60 rounded-sm h-1.5 shadow-inner overflow-hidden">
                        <div
                          className={`h-1.5 rounded-sm transition-all duration-500 shadow-sm ${(dept.attentionRatio || 0) < 0.15 ? "bg-success/80" :
                            (dept.attentionRatio || 0) <= 0.30 ? "bg-warning/80" :
                              "bg-danger/80"
                            }`}
                          style={{ width: `${(dept.attentionEmployees / dept.totalEmployees) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Performance */}
                    <div className="glass-effect rounded-md p-3.5 border border-border/40 shadow-sm">
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                          Avg Performance
                        </span>
                        <span className="text-sm font-bold text-foreground font-mono tabular-nums">
                          {dept.avgPerformance}%
                        </span>
                      </div>
                      <div className="w-full bg-muted/60 rounded-sm h-1.5 shadow-inner overflow-hidden">
                        <div
                          className={`h-1.5 rounded-sm transition-all duration-500 shadow-sm ${dept.avgPerformance >= 80 ? "bg-success/80" :
                            dept.avgPerformance >= 60 ? "bg-warning/80" :
                              "bg-danger/80"
                            }`}
                          style={{ width: `${dept.avgPerformance}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Click indicator */}
                  <div className="mt-5 pt-4 border-t border-border/30">
                    <p className="text-[10px] text-muted-foreground/70 font-semibold uppercase tracking-wider text-center">
                      Click to view employees →
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
