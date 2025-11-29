import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/DashboardHeader";
import { EmployeeCard } from "@/components/EmployeeCard";
import { PerformanceChart } from "@/components/PerformanceChart";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { SystemStatus } from "@/components/SystemStatus";
import { QuickActions } from "@/components/QuickActions";

const Index = () => {
  // Live Data State
  const [activeEmployees, setActiveEmployees] = useState(12);
  const [avgPerformance, setAvgPerformance] = useState(90);
  const [complianceRate, setComplianceRate] = useState(97);

  // Active Employees Logic (Every 1 min)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveEmployees(prev => {
        const change = Math.random() > 0.5 ? (Math.random() > 0.5 ? 2 : 1) : (Math.random() > 0.5 ? -2 : -1);
        let newValue = prev + change;
        // Clamp between 10 and 15
        if (newValue > 15) newValue = 15;
        if (newValue < 10) newValue = 10;
        return newValue;
      });
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  // Performance & Compliance Logic (Every 5 sec)
  useEffect(() => {
    const interval = setInterval(() => {
      setAvgPerformance(prev => Math.max(0, prev - 0.06));
      setComplianceRate(prev => Math.max(0, prev - 0.045));
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Calculate Trends
  const activeDiff = activeEmployees - 10; // Baseline 10
  const activeTrend = activeDiff >= 0 ? `+${activeDiff} this week` : `${activeDiff} this week`;

  const perfDiff = avgPerformance - 85; // Baseline 85
  const perfTrend = perfDiff >= 0 ? `+${perfDiff.toFixed(1)}% from last week` : `${perfDiff.toFixed(1)}% from last week`;

  const compDiff = complianceRate - 92; // Baseline 92
  const compTrend = compDiff >= 0 ? `+${compDiff.toFixed(2)}% improvement` : `${compDiff.toFixed(2)}% change`;

  const stats = {
    activeEmployees: {
      value: activeEmployees,
      trend: activeTrend,
      trendDirection: activeDiff >= 0 ? 'up' as const : 'down' as const
    },
    avgPerformance: {
      value: avgPerformance,
      trend: perfTrend
    },
    complianceRate: {
      value: complianceRate,
      trend: compTrend
    }
  };

  const employees = [
    {
      id: "emp-001",
      name: "test test",
      position: "Senior Developer",
      performanceScore: 95,
      status: "excellent" as const,
      lastActive: "2 mins ago",
    },
    {
      id: "emp-002",
      name: "Michael Chen",
      position: "Project Manager",
      performanceScore: 88,
      status: "good" as const,
      lastActive: "5 mins ago",
    },
    {
      id: "emp-003",
      name: "Emma Williams",
      position: "UI Designer",
      performanceScore: 92,
      status: "excellent" as const,
      lastActive: "1 min ago",
    },
    {
      id: "emp-004",
      name: "James Brown",
      position: "QA Engineer",
      performanceScore: 68,
      status: "needs-attention" as const,
      lastActive: "15 mins ago",
    },
    {
      id: "emp-005",
      name: "Lisa Anderson",
      position: "DevOps Engineer",
      performanceScore: 85,
      status: "good" as const,
      lastActive: "8 mins ago",
    },
    {
      id: "emp-006",
      name: "David Martinez",
      position: "Backend Developer",
      performanceScore: 91,
      status: "excellent" as const,
      lastActive: "3 mins ago",
    },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      {/* Subtle industrial background */}
      <div className="absolute inset-0 bg-industrial-grid opacity-[0.02] pointer-events-none" />
      
      <div className="container mx-auto px-4 py-8 max-w-[1600px] relative">
        <DashboardHeader stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <PerformanceChart />
          </div>
          <div>
            <SystemStatus />
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-1.5 h-10 gradient-primary rounded-full shadow-glow" />
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                Employee Monitoring Panel
              </h2>
              <p className="text-sm text-muted-foreground font-medium">
                Real-time monitoring with live camera feeds and performance tracking
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {employees.map((employee, index) => (
            <div
              key={employee.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <EmployeeCard {...employee} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ActivityTimeline />
          </div>
          <div>
            <QuickActions />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
