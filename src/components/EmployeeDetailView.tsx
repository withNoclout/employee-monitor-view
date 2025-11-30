import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { EmployeeCard } from "@/components/EmployeeCard";
import { motion } from "framer-motion";
import { SearchBar } from "@/components/SearchBar";

interface EmployeeDetailViewProps {
  departmentId: string;
  onBack: () => void;
  employees: any[];
  selectedEmployeeId?: string | null;
  onSelectEmployee?: (employeeId: string) => void;
}

export const EmployeeDetailView = ({ departmentId, onBack, employees, selectedEmployeeId, onSelectEmployee }: EmployeeDetailViewProps) => {
  const getDepartmentName = (id: string) => {
    const names: Record<string, string> = {
      production: "Production Floor",
      assembly: "Assembly Line",
      maintenance: "Maintenance",
      quality: "Quality Control",
      logistics: "Logistics",
      workforce: "General Workforce"
    };
    return names[id] || id;
  };

  // Filter employees for this department
  let displayEmployees = employees.filter(e => e.department === departmentId);

  // Reorder if there is a selected employee
  if (selectedEmployeeId) {
    const selectedIndex = displayEmployees.findIndex(e => e.id === selectedEmployeeId);
    if (selectedIndex > -1) {
      const selectedEmp = displayEmployees[selectedIndex];
      displayEmployees.splice(selectedIndex, 1);
      displayEmployees.unshift(selectedEmp);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header with back button */}
      <div className="flex items-center justify-between">
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
                {getDepartmentName(departmentId)}
              </h2>
              <p className="text-sm text-muted-foreground font-medium">
                Showing {displayEmployees.length} active employees
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="w-64">
          <SearchBar
            employees={displayEmployees}
            onSelectEmployee={(id) => onSelectEmployee && onSelectEmployee(id)}
          />
        </div>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayEmployees.map((employee, index) => (
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
