import { DashboardHeader } from "@/components/DashboardHeader";
import { EmployeeCard } from "@/components/EmployeeCard";

const Index = () => {
  const employees = [
    {
      id: "emp-001",
      name: "Sarah Johnson",
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
      <div className="container mx-auto px-4 py-8">
        <DashboardHeader />
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Employee Monitoring Panel
          </h2>
          <p className="text-muted-foreground">
            Click on "View Camera" to monitor individual employee workstations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((employee) => (
            <EmployeeCard key={employee.id} {...employee} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
