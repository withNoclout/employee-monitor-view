import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/DashboardHeader";
import { EmployeeCard } from "@/components/EmployeeCard";
import { PerformanceChart } from "@/components/PerformanceChart";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { SystemStatus } from "@/components/SystemStatus";
import { QuickActions } from "@/components/QuickActions";

const Index = () => {
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-[1600px]">
        <DashboardHeader />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <PerformanceChart />
          </div>
          <div>
            <SystemStatus />
          </div>
        </div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-3">
            <div className="w-1 h-8 gradient-primary rounded-full" />
            Employee Monitoring Panel
          </h2>
          <p className="text-muted-foreground ml-4">
            Real-time monitoring with live camera feeds and performance tracking
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {employees.map((employee) => (
            <EmployeeCard key={employee.id} {...employee} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ActivityTimeline />
          </div>
          <div>
            <QuickActions />
            {/* New View Log button */}
            <Link to="/view-log">
              <Button className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-pink-600 text-white hover:shadow-lg transition-shadow">
                View Assembly Log
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
