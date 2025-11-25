import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Video, VideoOff, Maximize2, RefreshCw, Mic, MicOff, CheckCircle2, Calendar, AlertTriangle, ChevronRight, Play, Square } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as tf from '@tensorflow/tfjs';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as mobilenet from '@tensorflow-models/mobilenet';

// Mock employee data
const employeeData: Record<string, { name: string; position: string; status: string }> = {
  "emp-001": { name: "test test", position: "Senior Developer", status: "excellent" },
  "emp-002": { name: "Michael Chen", position: "Project Manager", status: "good" },
  "emp-003": { name: "Emma Williams", position: "UI Designer", status: "excellent" },
  "emp-004": { name: "James Brown", position: "QA Engineer", status: "needs-attention" },
  "emp-005": { name: "Lisa Anderson", position: "DevOps Engineer", status: "good" },
  "emp-006": { name: "David Martinez", position: "Backend Developer", status: "excellent" },
};

interface Task {
  id: string;
  title: string;
  type: 'daily' | 'calibration';
  frequency: string;
  status: 'pending' | 'completed';
  steps: string[];
}

const Monitor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLive, setIsLive] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  // AI & Workflow State
  const [detector, setDetector] = useState<handPoseDetection.HandDetector | null>(null);
  const [customModel, setCustomModel] = useState<tf.LayersModel | null>(null);
  const [mobilenetModel, setMobilenetModel] = useState<mobilenet.MobileNet | null>(null);
  const [modelClasses, setModelClasses] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<{ label: string; score: number } | null>(null);
  const [isTaskActive, setIsTaskActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [spokenWords, setSpokenWords] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);

  const employee = id ? employeeData[id] : null;

  // Load AI Models
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Load Hand Pose
        const model = handPoseDetection.SupportedModels.MediaPipeHands;
        const detectorConfig = {
          runtime: 'mediapipe' as const,
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
          modelType: 'full' as const
        };
        const handDetector = await handPoseDetection.createDetector(model, detectorConfig);
        setDetector(handDetector);
        console.log("Hand Pose model loaded");

        // Load Custom Model (if available)
        try {
          const loadedModel = await tf.loadLayersModel('indexeddb://my-model');
          setCustomModel(loadedModel);
          console.log("Custom model loaded");
        } catch (e) {
          console.log("No custom model found in IndexedDB");
        }

        // Load MobileNet
        const mbModel = await mobilenet.load();
        setMobilenetModel(mbModel);
        console.log("MobileNet loaded");

        // Load Classes
        const savedClasses = localStorage.getItem('model_classes');
        if (savedClasses) {
          setModelClasses(JSON.parse(savedClasses));
        }
      } catch (err) {
        console.error("Error loading models:", err);
      }
    };
    loadModels();
  }, []);

  // AI Detection Loop
  useEffect(() => {
    let animationFrameId: number;

    const detect = async () => {
      if (isLive && videoRef.current && canvasRef.current && detector) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (video.readyState === 4 && ctx) {
          // Match canvas size to video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // 1. Hand Pose Detection
          const hands = await detector.estimateHands(video);
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw Hands
          hands.forEach(hand => {
            hand.keypoints.forEach(kp => {
              ctx.beginPath();
              ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
              ctx.fillStyle = '#00ff00';
              ctx.fill();
            });
          });

          // 2. Custom Model Prediction
          if (customModel && mobilenetModel && modelClasses.length > 0) {
            const embedding = tf.tidy(() => {
               return mobilenetModel.infer(video, true);
            });
            
            const result = customModel.predict(embedding) as tf.Tensor;
            const predictions = await result.data();
            embedding.dispose();
            result.dispose();

            let maxScore = -1;
            let maxIndex = -1;
            for (let i = 0; i < predictions.length; i++) {
              if (predictions[i] > maxScore) {
                maxScore = predictions[i];
                maxIndex = i;
              }
            }

            if (maxScore > 0.85) {
              const label = modelClasses[maxIndex];
              
              ctx.font = "bold 24px Arial";
              ctx.fillStyle = "#00ff00";
              ctx.fillText(`${label}: ${(maxScore * 100).toFixed(1)}%`, 20, 50);
              
              ctx.strokeStyle = "#00ff00";
              ctx.lineWidth = 4;
              ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
            }
          }

          // 3. MobileNet Prediction (if model is loaded)
          if (mobilenetModel) {
            const predictions = await mobilenetModel.classify(video);
            setPrediction(predictions[0]);
            // Draw the top prediction on the canvas
            ctx.fillStyle = '#ff0000';
            ctx.font = '20px Arial';
            ctx.fillText(`${predictions[0].className}: ${Math.round(predictions[0].probability * 100)}%`, 10, 50);
          }
        }
      }
      animationFrameId = requestAnimationFrame(detect);
    };

    detect();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isLive, detector, customModel, mobilenetModel]);

  // Speech Recognition Setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const currentTranscript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join(' ');
        
        setTranscript(currentTranscript);
        
        // Karaoke Logic: Split transcript into words
        const words = currentTranscript.toLowerCase().split(' ');
        setSpokenWords(words);

        // Check for "Done" command
        if (words.some((w: string) => w.includes('done') || w.includes('next'))) {
          handleNextStep();
          // Reset transcript for next step
          // recognition.stop(); // Optional: restart to clear buffer
        }
      };

      recognitionRef.current = recognition;
    }
  }, [currentStepIndex, selectedTask]);

  const handleStartTask = () => {
    if (!selectedTask) return;
    setCountdown(3);
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === 1) {
          clearInterval(timer);
          setIsTaskActive(true);
          setCurrentStepIndex(0);
          startListening();
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
  };

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.log("Recognition already started");
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleNextStep = () => {
    if (!selectedTask) return;
    
    if (currentStepIndex < selectedTask.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      toast.success("Proceeding to next step");
      // Clear transcript for new step
      setTranscript("");
      setSpokenWords([]);
      // Restart recognition to clear buffer
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current.start(), 100);
      }
    } else {
      setIsTaskActive(false);
      stopListening();
      toast.success("Task Completed!");
      // Mark task as completed in state (optional)
    }
  };

  // Load tasks based on team assignment
  useEffect(() => {
    if (!id) return;

    const teamsData = localStorage.getItem('teams_data');
    const savedWIs = localStorage.getItem('saved_work_instructions');

    if (teamsData && savedWIs) {
      const teams = JSON.parse(teamsData);
      const wis = JSON.parse(savedWIs);

      // Find the team this employee belongs to
      const employeeTeam = teams.find((t: any) => t.memberIds.includes(id));

      if (employeeTeam && employeeTeam.currentWIId) {
        const assignedWI = wis.find((w: any) => w.id === employeeTeam.currentWIId);
        
        if (assignedWI) {
          // Generate tasks from the assigned WI
          const newTasks: Task[] = [
            {
              id: `cal-${assignedWI.id}`,
              title: `Calibration: ${assignedWI.title}`,
              type: 'calibration',
              frequency: 'Daily',
              status: 'pending',
              steps: ['Verify camera position', 'Check lighting conditions', 'Perform T-Pose for 3s']
            },
            {
              id: `task-${assignedWI.id}`,
              title: assignedWI.title,
              type: 'daily',
              frequency: 'Shift',
              status: 'pending',
              steps: assignedWI.steps.map((s: any) => s.description || "Perform step")
            }
          ];
          setTasks(newTasks);
          return;
        }
      }
    }

    // Fallback if no team/WI assigned
    setTasks([
      {
        id: 'default-1',
        title: 'General System Check',
        type: 'calibration',
        frequency: 'Daily',
        status: 'pending',
        steps: ['Check camera', 'Check microphone']
      }
    ]);

  }, [id]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      if (isLive && id === "emp-001") {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Error accessing webcam:", err);
          toast.error("Could not access webcam");
        }
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isLive, id]);

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
          <div className="lg:col-span-2 space-y-6">
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
                    id === "emp-001" ? (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        <canvas 
                          ref={canvasRef}
                          className="absolute inset-0 w-full h-full pointer-events-none"
                        />
                        
                        {/* Countdown Overlay */}
                        {countdown !== null && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
                            <div className="text-9xl font-bold text-white animate-bounce">
                              {countdown}
                            </div>
                          </div>
                        )}

                        {/* Karaoke / Task Overlay */}
                        {isTaskActive && selectedTask && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-8 z-40">
                            <div className="max-w-3xl mx-auto text-center space-y-4">
                              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/50 mb-2">
                                Step {currentStepIndex + 1} of {selectedTask.steps.length}
                              </Badge>
                              <h2 className="text-3xl font-bold text-white/50 leading-relaxed">
                                {selectedTask.steps[currentStepIndex].split(' ').map((word, i) => {
                                  const isSpoken = spokenWords.includes(word.toLowerCase().replace(/[.,]/g, ''));
                                  return (
                                    <span 
                                      key={i} 
                                      className={`transition-colors duration-300 ${isSpoken ? 'text-white scale-110 inline-block' : ''}`}
                                    >
                                      {word}{' '}
                                    </span>
                                  );
                                })}
                              </h2>
                              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-pulse">
                                <Mic className="w-4 h-4" />
                                <span>Say "Done" or "Next" to continue</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
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
                      </>
                    )
                  ) : (
                    <div className="text-center">
                      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <VideoOff className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <p className="text-foreground font-semibold mb-1">Camera feed offline</p>
                      <p className="text-sm text-muted-foreground">Click the video icon to reconnect</p>
                    </div>
                  )}
                  
                  {isLive && (
                    <>
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
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Task Detail View */}
            {selectedTask && (
              <Card className="border-border shadow-xl animate-in fade-in slide-in-from-bottom-4">
                <CardHeader className="border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <div className="w-2 h-6 gradient-accent rounded-full" />
                      {selectedTask.title}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      Step 1 of {selectedTask.steps.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-medium text-foreground">Instructions</h3>
                      <div className="space-y-3">
                        {selectedTask.steps.map((step, index) => (
                          <div 
                            key={index}
                            className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                              index === 0 ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}>
                              {index + 1}
                            </div>
                            <p className={`text-sm ${index === 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                              {step}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-medium text-foreground">Verification</h3>
                      <div className="bg-black/20 rounded-lg p-4 border border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Voice Command</span>
                          <Badge variant={isListening ? "destructive" : "secondary"} className="animate-pulse">
                            {isListening ? "Listening..." : "Ready"}
                          </Badge>
                        </div>
                        
                        <div className="h-24 bg-black/40 rounded border border-white/5 p-3 text-sm text-muted-foreground overflow-y-auto">
                          {transcript || "Say 'System Check' to verify..."}
                        </div>

                        <Button 
                          className={`w-full ${isTaskActive ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'}`}
                          onClick={isTaskActive ? () => setIsTaskActive(false) : handleStartTask}
                        >
                          {isTaskActive ? (
                            <>
                              <Square className="w-4 h-4 mr-2" />
                              Stop Task
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Start Task Sequence
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                        <div className="flex gap-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                          <div>
                            <h4 className="text-sm font-medium text-yellow-500">Calibration Required</h4>
                            <p className="text-xs text-yellow-500/80 mt-1">
                              Ensure you are standing within the designated zone before starting the sequence.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Monitoring Info */}
          <div className="space-y-6">
            <Card className="border-border shadow-xl h-full">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <div className="w-2 h-6 gradient-info rounded-full" />
                  Tasks & Calibration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-4 rounded-lg flex items-center justify-between border transition-all cursor-pointer
                      ${selectedTask?.id === task.id ? 'bg-muted/50 border-primary' : 'border-transparent'}
                      ${task.status === 'completed' ? 'opacity-70' : 'hover:bg-muted'}
                      `}
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center
                        ${task.status === 'completed' ? 'bg-success/10' : 'bg-primary/10'}
                        `}>
                          {task.status === 'completed' ? (
                            <CheckCircle2 className="w-6 h-6 text-success" />
                          ) : (
                            <Calendar className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {task.type === 'calibration' ? 'Calibration Task' : 'Daily Task'} - {task.frequency}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.status === 'completed' ? (
                          <Badge className="bg-success text-success-foreground rounded-full text-xs font-bold">
                            Completed
                          </Badge>
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  ))}
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
