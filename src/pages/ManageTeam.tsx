import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, FileText, CheckCircle2, Plus, Settings, UserPlus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Mock employee data (shared with Monitor.tsx)
const allEmployees = [
  { id: "emp-001", name: "test test", position: "Senior Developer" },
  { id: "emp-002", name: "Michael Chen", position: "Project Manager" },
  { id: "emp-003", name: "Emma Williams", position: "UI Designer" },
  { id: "emp-004", name: "James Brown", position: "QA Engineer" },
  { id: "emp-005", name: "Lisa Anderson", position: "DevOps Engineer" },
  { id: "emp-006", name: "David Martinez", position: "Backend Developer" },
];

interface WorkInstruction {
  id: string;
  title: string;
  steps: any[];
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
  memberIds: string[]; // Changed from number count to array of IDs
  currentWIId: string | null;
  status: 'active' | 'idle' | 'maintenance';
}

const ManageTeam = () => {
  const navigate = useNavigate();
  const [savedWIs, setSavedWIs] = useState<WorkInstruction[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>(() => {
    const saved = localStorage.getItem('teams_data');
    return saved ? JSON.parse(saved) : [
      { id: 'team-a', name: 'Assembly Team A', memberIds: ['emp-001', 'emp-002'], currentWIId: null, status: 'active' },
      { id: 'team-b', name: 'Quality Control', memberIds: ['emp-004'], currentWIId: null, status: 'idle' },
      { id: 'team-c', name: 'Packaging Unit', memberIds: ['emp-003', 'emp-005'], currentWIId: null, status: 'active' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('teams_data', JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    const wis = localStorage.getItem('saved_work_instructions');
    if (wis) {
      setSavedWIs(JSON.parse(wis));
    }
  }, []);

  const assignWI = (teamId: string, wiId: string) => {
    setTeams(teams.map(team =>
      team.id === teamId ? { ...team, currentWIId: wiId } : team
    ));
    toast.success("Work Instruction assigned successfully");
  };

  const addMember = (teamId: string, employeeId: string) => {
    setTeams(teams.map(team => {
      if (team.id === teamId) {
        if (team.memberIds.includes(employeeId)) {
          toast.error("Employee already in this team");
          return team;
        }
        // Remove from other teams first
        const otherTeams = teams.filter(t => t.id !== teamId && t.memberIds.includes(employeeId));
        if (otherTeams.length > 0) {
          toast.info(`Moved employee from ${otherTeams[0].name}`);
        }
        return { ...team, memberIds: [...team.memberIds, employeeId] };
      }
      // Remove from other teams
      return { ...team, memberIds: team.memberIds.filter(id => id !== employeeId) };
    }));
  };

  const removeMember = (teamId: string, employeeId: string) => {
    setTeams(teams.map(team =>
      team.id === teamId
        ? { ...team, memberIds: team.memberIds.filter(id => id !== employeeId) }
        : team
    ));
  };

  const createTeam = () => {
    if (!newTeamName.trim()) {
      toast.error("Please enter a team name");
      return;
    }
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name: newTeamName,
      memberIds: [],
      currentWIId: null,
      status: 'idle'
    };
    setTeams([...teams, newTeam]);
    setNewTeamName("");
    setIsCreateOpen(false);
    toast.success("Team created successfully");
  };

  const getWIName = (wiId: string | null) => {
    if (!wiId) return "None Assigned";
    const wi = savedWIs.find(w => w.id === wiId);
    return wi ? wi.title : "Unknown WI";
  };

  // Sorting Logic: More members first
  const sortedTeams = [...teams].sort((a, b) => {
    return b.memberIds.length - a.memberIds.length;
  });

  // Smart Badge Logic
  const getTeamStatus = (team: Team) => {
    if (team.memberIds.length === 0) return { label: "Unassigned", variant: "destructive" as const };

    const wiName = getWIName(team.currentWIId);
    if (wiName.toLowerCase().includes("daily")) {
      return { label: "High Priority", variant: "default" as const, className: "bg-orange-500 hover:bg-orange-600" };
    }

    if (team.currentWIId) return { label: "Active", variant: "default" as const, className: "bg-green-500 hover:bg-green-600" };

    return { label: "Idle", variant: "secondary" as const };
  };

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/")} className="shadow-industrial">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="h-8 w-px bg-border/50" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Teams</h1>
            <p className="text-muted-foreground">Assign Work Instructions and monitor team status</p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-industrial">
              <Plus className="w-4 h-4 mr-2" />
              Create New Team
            </Button>
          </DialogTrigger>
          <DialogContent className="shadow-industrial-lg border-border">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>Add a new team to your organization.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g., Maintenance Crew"
                  className="border-border"
                />
              </div>
            </div>
            <Button onClick={createTeam} className="w-full">Create Team</Button>
          </DialogContent>
        </Dialog>
      </div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
      >
        <AnimatePresence mode="popLayout">
          {sortedTeams.map((team) => {
            const status = getTeamStatus(team);
            return (
              <motion.div
                key={team.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{
                  layout: { duration: 0.4, type: "spring", bounce: 0.2 },
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.3 }
                }}
              >
                <Card className="border-border shadow-industrial-lg hover:shadow-glow transition-all duration-300 overflow-hidden group h-full">
              <div className="gradient-industrial absolute inset-0 opacity-5" />
              <CardHeader className="pb-4 relative z-10">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20 shadow-glow">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5">
                        <Users className="w-3 h-3" />
                        {team.memberIds.length} Members
                      </CardDescription>
                    </div>
                  </div>
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Badge variant={status.variant} className={`${status.className} shadow-industrial`}>
                      {status.label}
                    </Badge>
                  </motion.div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 relative z-10">
                {/* Members Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Team Members
                    </label>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-primary/10 shadow-industrial">
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="shadow-industrial-lg border-border max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-primary" />
                            Add Member to {team.name}
                          </DialogTitle>
                          <DialogDescription>Select an employee to add to this team.</DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="max-h-[60vh]">
                          <div className="space-y-2 mt-4 pr-4">
                            {allEmployees.map(emp => {
                              const isInTeam = team.memberIds.includes(emp.id);
                              const assignedTeam = teams.find(t => t.memberIds.includes(emp.id));

                              return (
                                <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors shadow-industrial">
                                  <div>
                                    <p className="font-medium text-sm">{emp.name}</p>
                                    <p className="text-xs text-muted-foreground">{emp.position}</p>
                                  </div>
                                  {isInTeam ? (
                                    <Badge variant="secondary" className="shadow-industrial">Current</Badge>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="shadow-industrial"
                                      onClick={() => {
                                        addMember(team.id, emp.id);
                                        toast.success(`Added ${emp.name} to ${team.name}`);
                                      }}
                                    >
                                      Add
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <motion.div 
                    className="flex flex-wrap gap-2"
                    layout
                  >
                    <AnimatePresence mode="popLayout">
                      {team.memberIds.map(memberId => {
                        const member = allEmployees.find(e => e.id === memberId);
                        if (!member) return null;
                        return (
                          <motion.div
                            key={memberId}
                            layout
                            initial={{ opacity: 0, scale: 0.8, x: -10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.8, x: 10 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Badge variant="secondary" className="pl-2.5 pr-1.5 py-1 flex items-center gap-1.5 shadow-industrial">
                              {member.name}
                              <button
                                onClick={() => removeMember(team.id, memberId)}
                                className="hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    {team.memberIds.length === 0 && (
                      <motion.span 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-muted-foreground italic"
                      >
                        No members assigned
                      </motion.span>
                    )}
                  </motion.div>
                </div>

                {/* Current Assignment */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Current Assignment
                  </label>
                  <div className="p-3.5 glass-effect rounded-lg border border-border/50 shadow-industrial">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{getWIName(team.currentWIId)}</span>
                    </div>
                    {team.currentWIId && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        <span>Active since 08:00 AM</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assign New Instruction */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Assign New Instruction</label>
                  <Select
                    onValueChange={(value) => assignWI(team.id, value)}
                    value={team.currentWIId || undefined}
                  >
                    <SelectTrigger className="border-border shadow-industrial">
                      <SelectValue placeholder="Select Work Instruction" />
                    </SelectTrigger>
                    <SelectContent className="shadow-industrial-lg border-border">
                      {savedWIs.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No saved instructions found.
                          <br />
                          <span className="text-xs opacity-70">Go to Build WI to create one.</span>
                        </div>
                      ) : (
                        savedWIs.map((wi) => (
                          <SelectItem key={wi.id} value={wi.id}>
                            {wi.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-border/50 flex justify-between items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground shadow-industrial">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                  <Button variant="outline" size="sm" className="shadow-industrial">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ManageTeam;
