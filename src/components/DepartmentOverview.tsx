import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Factory, Package, Wrench, ShieldCheck, Truck, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface Department {
  id: string;
  name: string;
  icon: React.ReactNode;
  totalEmployees: number;
  activeEmployees: number;
  avgPerformance: number;
  status: "excellent" | "good" | "needs-attention";
  color: string;
}

interface DepartmentOverviewProps {
  onDepartmentClick: (departmentId: string) => void;
}

export const DepartmentOverview = ({ onDepartmentClick }: DepartmentOverviewProps) => {
  const departments: Department[] = [
    {
      id: "production",
      name: "Production Floor",
      icon: <Factory className="w-8 h-8" />,
      totalEmployees: 450,
      activeEmployees: 423,
      avgPerformance: 92,
      status: "excellent",
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "assembly",
      name: "Assembly Line",
      icon: <Package className="w-8 h-8" />,
      totalEmployees: 320,
      activeEmployees: 298,
      avgPerformance: 88,
      status: "good",
      color: "from-purple-500 to-purple-600",
    },
    {
      id: "maintenance",
      name: "Maintenance",
      icon: <Wrench className="w-8 h-8" />,
      totalEmployees: 85,
      activeEmployees: 81,
      avgPerformance: 90,
      status: "excellent",
      color: "from-orange-500 to-orange-600",
    },
    {
      id: "quality",
      name: "Quality Control",
      icon: <ShieldCheck className="w-8 h-8" />,
      totalEmployees: 120,
      activeEmployees: 115,
      avgPerformance: 95,
      status: "excellent",
      color: "from-green-500 to-green-600",
    },
    {
      id: "logistics",
      name: "Logistics",
      icon: <Truck className="w-8 h-8" />,
      totalEmployees: 95,
      activeEmployees: 87,
      avgPerformance: 85,
      status: "good",
      color: "from-cyan-500 to-cyan-600",
    },
    {
      id: "workforce",
      name: "General Workforce",
      icon: <Users className="w-8 h-8" />,
      totalEmployees: 280,
      activeEmployees: 265,
      avgPerformance: 87,
      status: "good",
      color: "from-indigo-500 to-indigo-600",
    },
  ];

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
        {departments.map((dept, index) => (
          <motion.div
            key={dept.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className="cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-industrial-lg border-border group bg-card relative"
              onClick={() => onDepartmentClick(dept.id)}
            >
              {/* Status bar */}
              <div className={`h-1 bg-gradient-to-r ${dept.color}`} />
              
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${dept.color} flex items-center justify-center shadow-industrial relative overflow-hidden group-hover:scale-110 transition-transform duration-300`}>
                      <div className="text-white relative z-10">
                        {dept.icon}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-lg mb-1">
                        {dept.name}
                      </h3>
                      <Badge className={`${getStatusColor(dept.status)} shadow-sm font-medium text-xs`}>
                        {getStatusText(dept.status)}
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>

                {/* Stats Grid */}
                <div className="space-y-4">
                  {/* Employees */}
                  <div className="bg-muted/20 rounded-lg p-3 border border-border/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Employees
                      </span>
                      <span className="text-sm font-bold text-foreground font-mono">
                        {dept.activeEmployees}/{dept.totalEmployees}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 shadow-inner overflow-hidden">
                      <div
                        className={`h-2 rounded-full bg-gradient-to-r ${dept.color} transition-all duration-500`}
                        style={{ width: `${(dept.activeEmployees / dept.totalEmployees) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Performance */}
                  <div className="bg-muted/20 rounded-lg p-3 border border-border/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Avg Performance
                      </span>
                      <span className="text-sm font-bold text-foreground font-mono">
                        {dept.avgPerformance}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 shadow-inner overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          dept.avgPerformance >= 90 ? "gradient-success" :
                          dept.avgPerformance >= 80 ? "gradient-warning" :
                          "gradient-danger"
                        } transition-all duration-500`}
                        style={{ width: `${dept.avgPerformance}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Click indicator */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-muted-foreground font-medium">
                    Click to view employees →
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
