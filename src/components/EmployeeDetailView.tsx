import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { EmployeeCard } from "@/components/EmployeeCard";
import { motion } from "framer-motion";

interface EmployeeDetailViewProps {
  departmentId: string;
  onBack: () => void;
}

export const EmployeeDetailView = ({ departmentId, onBack }: EmployeeDetailViewProps) => {
  // Mock employee data based on department
  const getDepartmentEmployees = () => {
    const baseEmployees = [
      {
        id: "emp-001",
        name: "Sarah Johnson",
        position: "Production Supervisor",
        performanceScore: 95,
        status: "excellent" as const,
        lastActive: "2 mins ago",
      },
      {
        id: "emp-002",
        name: "Michael Chen",
        position: "Machine Operator",
        performanceScore: 88,
        status: "good" as const,
        lastActive: "5 mins ago",
      },
      {
        id: "emp-003",
        name: "Emma Williams",
        position: "Quality Inspector",
        performanceScore: 92,
        status: "excellent" as const,
        lastActive: "1 min ago",
      },
      {
        id: "emp-004",
        name: "James Brown",
        position: "Assembly Worker",
        performanceScore: 68,
        status: "needs-attention" as const,
        lastActive: "15 mins ago",
      },
      {
        id: "emp-005",
        name: "Lisa Anderson",
        position: "Line Lead",
        performanceScore: 85,
        status: "good" as const,
        lastActive: "8 mins ago",
      },
      {
        id: "emp-006",
        name: "David Martinez",
        position: "Technician",
        performanceScore: 91,
        status: "excellent" as const,
        lastActive: "3 mins ago",
      },
    ];

    return baseEmployees;
  };

  const getDepartmentName = () => {
    const names: Record<string, string> = {
      production: "Production Floor",
      assembly: "Assembly Line",
      maintenance: "Maintenance",
      quality: "Quality Control",
      logistics: "Logistics",
      workforce: "General Workforce",
    };
    return names[departmentId] || "Department";
  };

  const employees = getDepartmentEmployees();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button
          onClick={onBack}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 hover:bg-muted transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 gradient-primary rounded-full shadow-glow" />
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              {getDepartmentName()}
            </h2>
            <p className="text-sm text-muted-foreground font-medium">
              Showing {employees.length} active employees
            </p>
          </div>
        </div>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((employee, index) => (
          <motion.div
            key={employee.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <EmployeeCard {...employee} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
