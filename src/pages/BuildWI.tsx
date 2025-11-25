import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Mic, 
  MicOff, 
  Play, 
  CheckCircle2, 
  GripVertical,
  Box,
  Hand,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClassInfo {
  id: string;
  name: string;
  count: number;
  isTrained: boolean;
  includeInTraining: boolean;
}

interface WIStep {
  id: string;
  gestureId: string | null;
  componentId: string | null;
  description: string;
}

const BuildWI = () => {
  const navigate = useNavigate();
  const [gestures, setGestures] = useState<ClassInfo[]>([]);
  const [components, setComponents] = useState<ClassInfo[]>([]);
  const [steps, setSteps] = useState<WIStep[]>([]);
  const [wiTitle, setWiTitle] = useState("New Work Instruction");
  
  // Routine State
  const [frequency, setFrequency] = useState("Daily");
  const [scheduledTime, setScheduledTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  
  // Verification State
  const [verificationText, setVerificationText] = useState("");
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    // Load data from localStorage (shared with Training page)
    const savedGestures = localStorage.getItem('movement_classes');
    const savedComponents = localStorage.getItem('training_classes');
    
    if (savedGestures) setGestures(JSON.parse(savedGestures));
    if (savedComponents) setComponents(JSON.parse(savedComponents));
  }, []);

  const addStep = (gestureId: string | null = null, componentId: string | null = null) => {
    const newStep: WIStep = {
      id: Math.random().toString(36).substr(2, 9),
      gestureId,
      componentId,
      description: ""
    };
    setSteps([...steps, newStep]);
  };

  const handleDragStart = (e: React.DragEvent, type: 'gesture' | 'component', id: string) => {
    e.dataTransfer.setData("type", type);
    e.dataTransfer.setData("id", id);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    const id = e.dataTransfer.getData("id");
    
    if (type === 'gesture') {
      addStep(id, null);
      toast.success("Added new step with gesture");
    } else if (type === 'component') {
      addStep(null, id);
      toast.success("Added new step with component");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const updateStep = (id: string, field: keyof WIStep, value: any) => {
    setSteps(steps.map(step => 
      step.id === id ? { ...step, [field]: value } : step
    ));
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(step => step.id !== id));
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      toast.success("Voice recording stopped");
    } else {
      setIsListening(true);
      toast.info("Listening... (Simulated)");
      // Simulate speech to text
      setTimeout(() => {
        setVerificationText(prev => prev + " I need to pick up the motherboard and place it on the mat.");
        setIsListening(false);
      }, 2000);
    }
  };

  const saveWI = () => {
    if (steps.length === 0) {
      toast.error("Please add at least one step");
      return;
    }
    
    const newWI = {
      id: Math.random().toString(36).substr(2, 9),
      title: wiTitle,
      frequency,
      scheduledTime,
      steps,
      verificationText,
      createdAt: new Date().toISOString()
    };

    const existingWIs = JSON.parse(localStorage.getItem('saved_work_instructions') || '[]');
    localStorage.setItem('saved_work_instructions', JSON.stringify([...existingWIs, newWI]));
    
    console.log("Saving WI:", newWI);
    toast.success("Work Instruction saved successfully!");
  };

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              Build Work Instruction
            </h1>
            <p className="text-muted-foreground">Create assembly sequences with gestures and components</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={saveWI} className="gap-2">
            <Save className="w-4 h-4" />
            Save Instruction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar: Resources */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Hand className="w-5 h-5 text-primary" />
                Available Gestures
              </CardTitle>
              <CardDescription>Drag or select gestures</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px] px-4 pb-4">
                <div className="space-y-2">
                  {gestures.map(g => (
                    <div 
                      key={g.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'gesture', g.id)}
                      className="p-3 border rounded-lg bg-card hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium text-sm">{g.name}</span>
                      <Badge variant="secondary" className="text-[10px]">Gesture</Badge>
                    </div>
                  ))}
                  {gestures.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No gestures found. Go to Training to add some.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Box className="w-5 h-5 text-secondary-foreground" />
                Components
              </CardTitle>
              <CardDescription>Available parts</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px] px-4 pb-4">
                <div className="space-y-2">
                  {components.map(c => (
                    <div 
                      key={c.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'component', c.id)}
                      className="p-3 border rounded-lg bg-card hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium text-sm">{c.name}</span>
                      <Badge variant="outline" className="text-[10px]">Item</Badge>
                    </div>
                  ))}
                  {components.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No components found. Go to Training to add some.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Main Content: Sequence Builder */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Assembly Sequence</CardTitle>
                <Button size="sm" onClick={() => addStep()} variant="secondary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step
                </Button>
              </div>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Instruction Title</label>
                  <Input 
                    value={wiTitle} 
                    onChange={(e) => setWiTitle(e.target.value)}
                    className="text-lg font-semibold"
                    placeholder="Instruction Title"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Frequency</label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Shift">Per Shift</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Scheduled Time</label>
                    <Input 
                      type="time" 
                      value={scheduledTime} 
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent 
              className="flex-1 bg-muted/10 p-6 transition-colors data-[drag-active=true]:bg-primary/5"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={step.id} className="relative flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold z-10">
                        {index + 1}
                      </div>
                      {index < steps.length - 1 && (
                        <div className="w-0.5 flex-1 bg-border my-2" />
                      )}
                    </div>
                    
                    <Card className="flex-1 mb-4">
                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Action (Gesture)</label>
                            <Select 
                              value={step.gestureId || ""} 
                              onValueChange={(value) => updateStep(step.id, 'gestureId', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select Gesture..." />
                              </SelectTrigger>
                              <SelectContent>
                                {gestures.map(g => (
                                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Target (Component)</label>
                            <Select 
                              value={step.componentId || ""} 
                              onValueChange={(value) => updateStep(step.id, 'componentId', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select Component..." />
                              </SelectTrigger>
                              <SelectContent>
                                {components.map(c => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Input 
                          placeholder="Step description (e.g., Pick up the CPU carefully)"
                          value={step.description}
                          onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                        />
                      </CardContent>
                      <div className="absolute top-4 right-4">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeStep(step.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  </div>
                ))}
                
                {steps.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl pointer-events-none">
                    <p className="text-muted-foreground">Drag items here or click "Add Step" to begin.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Verification */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Verification
              </CardTitle>
              <CardDescription>Operator understanding check</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-2">Instructions:</p>
                <p className="text-muted-foreground">
                  Ask the operator to explain the process back to you. Use the microphone to record their response and verify understanding.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Operator Response</label>
                  <Button 
                    size="sm" 
                    variant={isListening ? "destructive" : "outline"}
                    className={isListening ? "animate-pulse" : ""}
                    onClick={toggleListening}
                  >
                    {isListening ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                    {isListening ? "Stop Recording" : "Start Recording"}
                  </Button>
                </div>
                <Textarea 
                  className="min-h-[200px] resize-none"
                  placeholder="Transcribed text will appear here..."
                  value={verificationText}
                  onChange={(e) => setVerificationText(e.target.value)}
                />
              </div>

              <Button className="w-full" variant="secondary" disabled={!verificationText}>
                Analyze Understanding
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BuildWI;
