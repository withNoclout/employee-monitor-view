import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="h-8 w-px bg-border" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Teams</h1>
            <p className="text-muted-foreground">Assign Work Instructions and monitor team status</p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create New Team
            </Button>
          </DialogTrigger>
          <DialogContent>
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
                />
              </div>
            </div>
            <Button onClick={createTeam} className="w-full">Create Team</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedTeams.map((team) => {
          const status = getTeamStatus(team);
          return (
            <Card key={team.id} className="border-border shadow-lg hover:shadow-xl transition-all">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <CardDescription>{team.memberIds.length} Members</CardDescription>
                    </div>
                  </div>
                  <Badge variant={status.variant} className={status.className}>
                    {status.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Members Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Team Members</label>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Member to {team.name}</DialogTitle>
                          <DialogDescription>Select an employee to add to this team.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 mt-4">
                          {allEmployees.map(emp => {
                            const isInTeam = team.memberIds.includes(emp.id);
                            const assignedTeam = teams.find(t => t.memberIds.includes(emp.id));

                            return (
                              <div key={emp.id} className="flex items-center justify-between p-2 rounded border hover:bg-muted/50">
                                <div>
                                  <p className="font-medium text-sm">{emp.name}</p>
                                  <p className="text-xs text-muted-foreground">{emp.position}</p>
                                </div>
                                {isInTeam ? (
                                  <Badge variant="secondary">Current</Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
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
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {team.memberIds.map(memberId => {
                      const member = allEmployees.find(e => e.id === memberId);
                      if (!member) return null;
                      return (
                        <Badge key={memberId} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                          {member.name}
                          <button
                            onClick={() => removeMember(team.id, memberId)}
                            className="hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    {team.memberIds.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No members assigned</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Current Assignment</label>
                  <div className="p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{getWIName(team.currentWIId)}</span>
                    </div>
                    {team.currentWIId && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span>Active since 08:00 AM</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Assign New Instruction</label>
                  <Select
                    onValueChange={(value) => assignWI(team.id, value)}
                    value={team.currentWIId || undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Work Instruction" />
                    </SelectTrigger>
                    <SelectContent>
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

                <div className="pt-4 border-t border-border flex justify-between items-center">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  );
};

export default ManageTeam;
