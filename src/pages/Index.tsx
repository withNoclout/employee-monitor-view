import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/DashboardHeader";
import { EmployeeCard } from "@/components/EmployeeCard";
import { PerformanceChart } from "@/components/PerformanceChart";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { SystemStatus } from "@/components/SystemStatus";
import { QuickActions } from "@/components/QuickActions";
import { Navbar } from "@/components/Navbar";
import { DepartmentOverview } from "@/components/DepartmentOverview";
import { EmployeeDetailView } from "@/components/EmployeeDetailView";

import { SearchBar } from "@/components/SearchBar";

const Index = () => {
  // View state: 'overview' or specific department ID
  const [currentView, setCurrentView] = useState<string>("overview");

  // Live Data State
  const [employees, setEmployees] = useState<any[]>([]);
  const [activeEmployees, setActiveEmployees] = useState(0);
  const [avgPerformance, setAvgPerformance] = useState(0);
  const [complianceRate, setComplianceRate] = useState(97);

  // Search & Highlight State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [highlightedDeptId, setHighlightedDeptId] = useState<string | null>(null);

  const handleDepartmentClick = (departmentId: string) => {
    setCurrentView(departmentId);
    setHighlightedDeptId(null); // Clear highlight on enter
  };

  const handleBackToOverview = () => {
    setCurrentView("overview");
    setSelectedEmployeeId(null);
  };

  const handleSearchSelect = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      setSelectedEmployeeId(employeeId);
      setHighlightedDeptId(employee.department);
      // Ensure we are on overview to see the highlight first
      setCurrentView("overview");

      // Optional: scroll to department card? 
      // For now, the highlight is enough.
    }
  };

  // Fetch Employees Logic (Every 3 sec)
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/employees');
        if (res.ok) {
          const data = await res.json();
          setEmployees(data);

          // Calculate stats
          // Count "Idle" employees (Attention Employees)
          const idleCount = data.filter((e: any) => e.workingState !== 'working').length;
          // Active is total - idle? Or just total? 
          // Let's stick to total active in system for top stats
          const active = data.length;
          setActiveEmployees(active);

          const avgPerf = data.length > 0
            ? data.reduce((acc: number, curr: any) => acc + curr.performanceScore, 0) / data.length
            : 0;
          setAvgPerformance(parseFloat(avgPerf.toFixed(1)));

          // Compliance can be mocked or calculated based on "needs-attention" ratio
          const compliant = data.filter((e: any) => e.status !== 'needs-attention').length;
          const compRate = data.length > 0 ? (compliant / data.length) * 100 : 100;
          setComplianceRate(parseFloat(compRate.toFixed(1)));
        }
      } catch (error) {
        console.error("Failed to fetch employees:", error);
      }
    };

    fetchEmployees(); // Initial fetch
    const interval = setInterval(fetchEmployees, 3000);
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

  return (
    <div className="min-h-screen bg-background relative">
      {/* Sticky Navbar */}
      <Navbar />

      {/* Subtle industrial background */}
      <div className="absolute inset-0 bg-industrial-grid opacity-[0.02] pointer-events-none" />

      <div className="container mx-auto px-4 py-8 max-w-[1600px] relative">
        <div className="mb-6">
          <DashboardHeader stats={stats} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <PerformanceChart />
          </div>
          <div>
            <SystemStatus />
          </div>
        </div>

        <div className="mb-6 flex items-end justify-between">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-10 gradient-primary rounded-full shadow-glow" />
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {currentView === "overview" ? "Department Overview" : "Employee Monitoring"}
              </h2>
              <p className="text-sm text-muted-foreground font-medium">
                {currentView === "overview"
                  ? "Select a department to view detailed employee monitoring"
                  : "Real-time monitoring with live camera feeds and performance tracking"
                }
              </p>
            </div>
          </div>

          {currentView === "overview" && (
            <div className="mb-1">
              <SearchBar employees={employees} onSelectEmployee={handleSearchSelect} />
            </div>
          )}
        </div>

        {/* Conditional rendering based on view */}
        {currentView === "overview" ? (<DepartmentOverview
          onDepartmentClick={handleDepartmentClick}
          employees={employees}
          highlightedDeptId={highlightedDeptId}
          onSelectEmployee={handleSearchSelect}
        />
        ) : (
          <EmployeeDetailView
            departmentId={currentView}
            onBack={handleBackToOverview}
            employees={employees}
            selectedEmployeeId={selectedEmployeeId}
            onSelectEmployee={handleSearchSelect}
          />
        )}


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
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
