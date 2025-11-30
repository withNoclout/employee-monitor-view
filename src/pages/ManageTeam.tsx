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
// Mock employee data replaced with fetch logic inside component

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
  const [allEmployees, setAllEmployees] = useState<any[]>([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/employees');
        const data = await res.json();
        setAllEmployees(data);
      } catch (err) {
        console.error("Failed to fetch employees:", err);
      }
    };
    fetchEmployees();
  }, []);
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

  // Just update local state when dropdown changes
  const handleWISelect = (teamId: string, wiId: string) => {
    setTeams(teams.map(team =>
      team.id === teamId ? { ...team, currentWIId: wiId } : team
    ));
  };

  // Actual sync to server when Save is clicked
  const saveTeamAssignment = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || !team.currentWIId) {
      toast.error("No Work Instruction selected");
      return;
    }

    const wi = savedWIs.find(w => w.id === team.currentWIId);
    if (!wi) return;

    let assignedCount = 0;

    for (const memberId of team.memberIds) {
      try {
        // Fetch current employee data
        const res = await fetch(`http://localhost:3000/api/employees`);
        const allData = await res.json();
        const employee = allData.find((e: any) => e.id === memberId);

        if (employee) {
          const existingTasks = employee.tasks || [];

          // Create new task
          const newTask = {
            id: `task-${wi.id}-${Date.now()}`,
            wiId: wi.id,
            title: wi.title,
            type: 'routine',
            frequency: 'Daily',
            dueDate: 'Today',
            status: 'pending',
            completedSteps: 0,
            totalSteps: wi.steps?.length || 0,
            dateKey: new Date().toISOString().split('T')[0],
            assigned_at: new Date().toISOString(), // Required for hours calculation
            completedAt: null,
            employeeId: memberId
          };

          // Append and sync
          const updatedTasks = [...existingTasks, newTask];

          await fetch(`http://localhost:3000/api/employees/${memberId}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks: updatedTasks })
          });
          assignedCount++;
        }
      } catch (err) {
        console.error(`Failed to assign task to ${memberId}:`, err);
      }
    }
    toast.success(`Assigned "${wi.title}" to ${assignedCount} members`);
  };

  const addMember = (teamId: string, employeeId: string) => {
    setTeams(teams.map(team => {
      if (team.id === teamId) {
        if (team.memberIds.includes(employeeId)) {
          toast.error("Employee already in this team");
          return team;
        }
        return { ...team, memberIds: [...team.memberIds, employeeId] };
      }
      return team;
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
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4 relative z-20">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="shadow-industrial hover:bg-muted/50 transition-colors cursor-pointer"
          >
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
            <Button className="shadow-industrial cursor-pointer">
              <Plus className="w-4 h-4 mr-2" />
              Create New Team
            </Button>
          </DialogTrigger>
          <DialogContent className="shadow-industrial-lg border-border/40">
            <DialogHeader>
              <DialogTitle className="tracking-tight">Create New Team</DialogTitle>
              <DialogDescription className="text-[11px]">Add a new team to your organization.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Team Name</Label>
                <Input
                  id="name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g., Maintenance Crew"
                  className="border-border/40 h-9"
                />
              </div>
            </div>
            <Button onClick={createTeam} className="w-full cursor-pointer h-9 text-sm">Create Team</Button>
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
                <Card className="border-border/50 shadow-industrial hover:shadow-glow transition-all duration-300 overflow-hidden group h-full">
                  {/* Subtle accent border */}
                  <div className="h-[2px] bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30" />

                  <CardHeader className="pb-4 relative z-10">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg border-2 border-border/50 bg-muted/30 backdrop-blur-sm flex items-center justify-center shadow-industrial group-hover:border-primary/50 group-hover:bg-primary/5 transition-all duration-300">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg tracking-tight">{team.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums">
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
                        <Badge variant={status.variant} className={`${status.className} shadow-sm font-semibold text-[10px] uppercase tracking-wider px-2`}>
                          {status.label}
                        </Badge>
                      </motion.div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 relative z-10">
                    {/* Members Section */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-primary" />
                          Team Members
                        </label>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-primary/10 shadow-industrial cursor-pointer">
                              <UserPlus className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="shadow-industrial-lg border-border/40 max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2 tracking-tight">
                                <UserPlus className="w-5 h-5 text-primary" />
                                Add Member to {team.name}
                              </DialogTitle>
                              <DialogDescription className="text-[11px]">Select an employee to add to this team.</DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[60vh]">
                              <div className="space-y-2 mt-4 pr-4">
                                {allEmployees.map(emp => {
                                  const isInTeam = team.memberIds.includes(emp.id);
                                  const assignedTeam = teams.find(t => t.memberIds.includes(emp.id));

                                  return (
                                    <div key={emp.id} className="flex items-center justify-between p-3 rounded-md border border-border/40 hover:bg-muted/30 transition-colors shadow-sm glass-effect">
                                      <div>
                                        <p className="font-semibold text-sm tracking-tight">{emp.name}</p>
                                        <p className="text-[11px] text-muted-foreground font-medium">{emp.position}</p>
                                      </div>
                                      {isInTeam ? (
                                        <Badge variant="secondary" className="shadow-sm text-[10px] uppercase tracking-wider">Current</Badge>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="shadow-sm cursor-pointer text-xs h-7"
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
                                <Badge variant="secondary" className="pl-2.5 pr-1.5 py-1 flex items-center gap-1.5 shadow-sm text-xs font-medium">
                                  {member.name}
                                  <button
                                    onClick={() => removeMember(team.id, memberId)}
                                    className="hover:bg-destructive/20 rounded-full p-0.5 transition-colors cursor-pointer"
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
                            className="text-[11px] text-muted-foreground/70 italic font-medium"
                          >
                            No members assigned
                          </motion.span>
                        )}
                      </motion.div>
                    </div>

                    {/* Current Assignment */}
                    <div className="space-y-2.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        Current Assignment
                      </label>
                      <div className="p-3.5 glass-effect rounded-md border border-border/40 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-sm tracking-tight">{getWIName(team.currentWIId)}</span>
                        </div>
                        {team.currentWIId && (
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                            <span>Active since 08:00 AM</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assign New Instruction */}
                    <div className="space-y-2.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Assign New Instruction</label>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(value) => handleWISelect(team.id, value)}
                          value={team.currentWIId || undefined}
                        >
                          <SelectTrigger className="border-border/40 shadow-sm h-9 text-sm flex-1">
                            <SelectValue placeholder="Select Work Instruction" />
                          </SelectTrigger>
                          <SelectContent className="shadow-industrial-lg border-border/40">
                            {savedWIs.length === 0 ? (
                              <div className="p-3 text-sm text-muted-foreground text-center">
                                No saved instructions found.
                                <br />
                                <span className="text-[11px] opacity-70 font-medium">Go to Build WI to create one.</span>
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
                        <Button
                          size="sm"
                          className="h-9 px-3 shadow-industrial cursor-pointer bg-primary/90 hover:bg-primary"
                          onClick={() => saveTeamAssignment(team.id)}
                          disabled={!team.currentWIId}
                        >
                          Save
                        </Button>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-border/30 flex justify-between items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-muted-foreground/70 hover:text-foreground shadow-sm cursor-pointer text-xs h-8">
                        <Settings className="w-3.5 h-3.5 mr-2" />
                        Settings
                      </Button>
                      <Button variant="outline" size="sm" className="shadow-sm cursor-pointer text-xs h-8">
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
