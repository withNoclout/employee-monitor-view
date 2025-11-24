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
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera Feed */}
          <div className="lg:col-span-2">
            <Card className="border-border">
              <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground">Live Camera Feed</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsLive(!isLive)}
                      className="border-border"
                    >
                      {isLive ? (
                        <Video className="w-4 h-4" />
                      ) : (
                        <VideoOff className="w-4 h-4" />
                      )}
                    </Button>
                    <Button variant="outline" size="icon" className="border-border">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="border-border">
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="aspect-video bg-secondary relative flex items-center justify-center">
                  {isLive ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
                      <div className="text-center z-10">
                        <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          Camera feed would appear here
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Webcam integration ready for implementation
                        </p>
                      </div>
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-danger/90 text-danger-foreground px-3 py-1.5 rounded-full text-sm font-medium">
                        <span className="w-2 h-2 bg-danger-foreground rounded-full animate-pulse" />
                        RECORDING
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <VideoOff className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Camera feed offline</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monitoring Info */}
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Monitoring Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Employee ID</p>
                  <p className="font-medium text-foreground">{id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Department</p>
                  <p className="font-medium text-foreground">Engineering</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Shift</p>
                  <p className="font-medium text-foreground">Morning (9:00 AM - 5:00 PM)</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Location</p>
                  <p className="font-medium text-foreground">Office - Floor 3</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Today's Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Hours Worked</p>
                  <p className="font-medium text-foreground">6h 32m</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tasks Completed</p>
                  <p className="font-medium text-foreground">8 / 10</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Compliance Score</p>
                  <p className="font-medium text-foreground">92%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Break Time</p>
                  <p className="font-medium text-foreground">45 minutes</p>
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
