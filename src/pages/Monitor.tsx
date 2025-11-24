import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Video, VideoOff, Maximize2, RefreshCw } from "lucide-react";
import { useState } from "react";

// Mock employee data
const employeeData: Record<string, { name: string; position: string; status: string }> = {
  "emp-001": { name: "Sarah Johnson", position: "Senior Developer", status: "excellent" },
  "emp-002": { name: "Michael Chen", position: "Project Manager", status: "good" },
  "emp-003": { name: "Emma Williams", position: "UI Designer", status: "excellent" },
  "emp-004": { name: "James Brown", position: "QA Engineer", status: "needs-attention" },
  "emp-005": { name: "Lisa Anderson", position: "DevOps Engineer", status: "good" },
  "emp-006": { name: "David Martinez", position: "Backend Developer", status: "excellent" },
};

const Monitor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLive, setIsLive] = useState(true);

  const employee = id ? employeeData[id] : null;

  if (!employee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Employee Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested employee monitoring session could not be found.
            </p>
            <Button onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-xl font-semibold text-foreground">{employee.name}</h1>
                <p className="text-sm text-muted-foreground">{employee.position}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                className={
                  employee.status === "excellent"
                    ? "bg-success text-success-foreground"
                    : employee.status === "good"
                    ? "bg-warning text-warning-foreground"
                    : "bg-danger text-danger-foreground"
                }
              >
                {isLive ? "● LIVE" : "● OFFLINE"}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-[1600px]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera Feed */}
          <div className="lg:col-span-2">
            <Card className="border-border shadow-xl overflow-hidden">
              <CardHeader className="border-b border-border bg-card">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground text-xl flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    Live Camera Feed
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsLive(!isLive)}
                      className="border-border hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      {isLive ? (
                        <Video className="w-4 h-4" />
                      ) : (
                        <VideoOff className="w-4 h-4" />
                      )}
                    </Button>
                    <Button variant="outline" size="icon" className="border-border hover:bg-primary hover:text-primary-foreground transition-colors">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="border-border hover:bg-primary hover:text-primary-foreground transition-colors">
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-secondary via-muted to-secondary relative flex items-center justify-center overflow-hidden">
                  {isLive ? (
                    <>
                      <div className="absolute inset-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent_50%)]" />
                      </div>
                      <div className="text-center z-10">
                        <div className="relative">
                          <div className="w-24 h-24 gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse-slow">
                            <Video className="w-12 h-12 text-white" />
                          </div>
                          <div className="absolute inset-0 gradient-primary rounded-full blur-2xl opacity-20 animate-pulse" />
                        </div>
                        <p className="text-foreground font-semibold text-lg mb-2">
                          Camera Feed Display Area
                        </p>
                        <p className="text-muted-foreground">
                          Webcam integration ready for implementation
                        </p>
                      </div>
                      <div className="absolute top-6 left-6 flex items-center gap-2 gradient-danger px-4 py-2.5 rounded-full text-sm font-bold text-white shadow-lg">
                        <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                        REC
                      </div>
                      <div className="absolute top-6 right-6 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border shadow-lg">
                        <p className="text-xs text-muted-foreground">Resolution</p>
                        <p className="text-sm font-semibold text-foreground">1920 x 1080</p>
                      </div>
                      <div className="absolute bottom-6 left-6 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border shadow-lg">
                        <p className="text-xs text-muted-foreground">FPS</p>
                        <p className="text-sm font-semibold text-foreground">30</p>
                      </div>
                      <div className="absolute bottom-6 right-6 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border shadow-lg">
                        <p className="text-xs text-muted-foreground">Bitrate</p>
                        <p className="text-sm font-semibold text-foreground">2.5 Mbps</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <VideoOff className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <p className="text-foreground font-semibold mb-1">Camera feed offline</p>
                      <p className="text-sm text-muted-foreground">Click the video icon to reconnect</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monitoring Info */}
          <div className="space-y-6">
            <Card className="border-border shadow-xl">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <div className="w-2 h-6 gradient-primary rounded-full" />
                  Monitoring Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Employee ID</p>
                  <p className="font-semibold text-foreground">{id}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Department</p>
                  <p className="font-semibold text-foreground">Engineering</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Shift</p>
                  <p className="font-semibold text-foreground">9:00 AM - 5:00 PM</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Location</p>
                  <p className="font-semibold text-foreground">Office - Floor 3</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xl">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <div className="w-2 h-6 gradient-success rounded-full" />
                  Today's Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/5 to-transparent">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Hours Worked</p>
                    <p className="font-bold text-foreground text-xl">6h 32m</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl">⏰</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-success/5 to-transparent">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Tasks Completed</p>
                    <p className="font-bold text-foreground text-xl">8 / 10</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                    <span className="text-2xl">✅</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-accent/5 to-transparent">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Compliance Score</p>
                    <p className="font-bold text-foreground text-xl">92%</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-warning/5 to-transparent">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Break Time</p>
                    <p className="font-bold text-foreground text-xl">45 min</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                    <span className="text-2xl">☕</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitor;
