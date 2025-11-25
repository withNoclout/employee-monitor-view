import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Video, VideoOff, CheckCircle2, Circle, PlayCircle, Clock, Calendar, ChevronRight, AlertCircle, Hand, Box, Loader2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';

// Employee data
const employeeData: Record<string, { name: string; position: string; status: string }> = {
  "emp-001": { name: "test test", position: "Senior Developer", status: "excellent" },
  "emp-002": { name: "Michael Chen", position: "Project Manager", status: "good" },
  "emp-003": { name: "Emma Williams", position: "UI Designer", status: "excellent" },
  "emp-004": { name: "James Brown", position: "QA Engineer", status: "needs-attention" },
  "emp-005": { name: "Lisa Anderson", position: "DevOps Engineer", status: "good" },
  "emp-006": { name: "David Martinez", position: "Backend Developer", status: "excellent" },
};

interface WIStep {
  id: string;
  gestureId: string | null;
  componentId: string | null;
  description: string;
}

interface WorkInstruction {
  id: string;
  title: string;
  steps: WIStep[];
  frequency?: string;
  createdAt: string;
}

interface Task {
  id: string;
  wiId: string;
  title: string;
  type: 'routine' | 'calibration' | 'one-time';
  frequency: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  completedSteps: number;
  totalSteps: number;
}

interface TrainedGesture {
  id: string;
  name: string;
  samples: number;
  data?: number[][];
}

interface Detection {
  class: string;
  confidence: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
}

const Monitor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLive, setIsLive] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Task State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [workInstructions, setWorkInstructions] = useState<WorkInstruction[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isTaskActive, setIsTaskActive] = useState(false);

  // Detection State
  const [detector, setDetector] = useState<handPoseDetection.HandDetector | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [trainedGestures, setTrainedGestures] = useState<TrainedGesture[]>([]);
  const [trainedComponents, setTrainedComponents] = useState<string[]>([]);
  const [currentGesture, setCurrentGesture] = useState<string | null>(null);
  const [currentComponents, setCurrentComponents] = useState<Detection[]>([]);
  const [handsDetected, setHandsDetected] = useState(0);
  const lastDetectionTime = useRef<number>(0);
  const [isDetecting, setIsDetecting] = useState(false);

  // Verification State
  const [stepVerified, setStepVerified] = useState(false);
  const verificationHoldTime = useRef<number>(0);
  const HOLD_DURATION = 2000; // Hold gesture/component for 2 seconds to verify

  // Performance optimization - frame skipping
  const frameCountRef = useRef<number>(0);
  const FRAME_SKIP = 3; // Process every 3rd frame for hand detection
  const COMPONENT_DETECTION_INTERVAL = 1500; // ms between YOLO detections

  const employee = id ? employeeData[id] : null;

  // Load Hand Pose Detector
  useEffect(() => {
    const loadDetector = async () => {
      setIsLoadingModel(true);
      try {
        const model = handPoseDetection.SupportedModels.MediaPipeHands;
        const detectorConfig = {
          runtime: 'mediapipe' as const,
          solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
          modelType: 'full' as const
        };
        const handDetector = await handPoseDetection.createDetector(model, detectorConfig);
        setDetector(handDetector);
        console.log("Hand Pose model loaded");
      } catch (err) {
        console.error("Error loading hand detector:", err);
      }
      setIsLoadingModel(false);
    };
    loadDetector();
  }, []);

  // Load trained gestures and components
  useEffect(() => {
    const savedGestures = localStorage.getItem('movement_classes');
    if (savedGestures) {
      setTrainedGestures(JSON.parse(savedGestures));
    }
    
    const savedComponents = localStorage.getItem('training_classes');
    if (savedComponents) {
      const components = JSON.parse(savedComponents);
      setTrainedComponents(components.map((c: any) => c.name));
    }
  }, []);

  // Extract features from hand landmarks
  const extractFeatures = useCallback((hand: handPoseDetection.Hand): number[] => {
    const wrist = hand.keypoints[0];
    return hand.keypoints.flatMap(kp => [
      (kp.x - wrist.x) / 100,
      (kp.y - wrist.y) / 100,
      (kp as any).z || 0
    ]);
  }, []);

  // KNN distance
  const knnDistance = (a: number[], b: number[]): number => {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - (b[i] || 0), 2), 0));
  };

  // Classify gesture using KNN
  const classifyGesture = useCallback((features: number[]): { gesture: string; confidence: number } | null => {
    if (trainedGestures.length === 0) return null;

    let minDist = Infinity;
    let bestGesture = "";
    let totalDist = 0;
    let count = 0;

    trainedGestures.forEach(gesture => {
      if (gesture.data && gesture.data.length > 0) {
        gesture.data.forEach(sample => {
          const dist = knnDistance(features, sample);
          totalDist += dist;
          count++;
          if (dist < minDist) {
            minDist = dist;
            bestGesture = gesture.name;
          }
        });
      }
    });

    if (count === 0 || minDist > 30) return null;
    
    const avgDist = totalDist / count;
    const confidence = Math.max(0, Math.min(1, 1 - (minDist / avgDist)));
    
    return { gesture: bestGesture, confidence };
  }, [trainedGestures]);

  // Check if current step requirements are met
  const checkStepVerification = useCallback((gesture: string | null, components: Detection[]) => {
    if (!selectedTask || !isTaskActive) return false;
    
    const currentTaskSteps = getStepsForTask(selectedTask);
    const currentStep = currentTaskSteps[currentStepIndex];
    if (!currentStep) return false;

    let gestureMatch = !currentStep.gestureId; // If no gesture required, it's a match
    let componentMatch = !currentStep.componentId; // If no component required, it's a match

    // Check gesture requirement
    if (currentStep.gestureId && gesture) {
      const requiredGesture = trainedGestures.find(g => g.id === currentStep.gestureId);
      if (requiredGesture && gesture.toLowerCase() === requiredGesture.name.toLowerCase()) {
        gestureMatch = true;
      }
    }

    // Check component requirement
    if (currentStep.componentId && components.length > 0) {
      const requiredComponent = trainedComponents.find((_, i) => `${i + 1}` === currentStep.componentId);
      if (requiredComponent) {
        const found = components.some(c => 
          c.class.toLowerCase() === requiredComponent.toLowerCase() && c.confidence > 0.5
        );
        if (found) componentMatch = true;
      }
    }

    return gestureMatch && componentMatch;
  }, [selectedTask, isTaskActive, currentStepIndex, trainedGestures, trainedComponents]);

  // Main Detection Loop
  useEffect(() => {
    let animationFrameId: number;

    const detect = async () => {
      if (!isLive || !videoRef.current || !canvasRef.current || !detector) {
        animationFrameId = requestAnimationFrame(detect);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (video.readyState === 4 && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Frame skipping - only process every Nth frame for performance
        frameCountRef.current++;
        const shouldProcessFrame = frameCountRef.current % FRAME_SKIP === 0;

        // Hand Detection (with frame skipping)
        let hands: handPoseDetection.Hand[] = [];
        if (shouldProcessFrame) {
          hands = await detector.estimateHands(video);
          setHandsDetected(hands.length);
        } else {
          // Use cached hand count
          hands = []; // Skip detection this frame
        }

        let detectedGesture: string | null = null;

        hands.forEach(hand => {
          // Draw small green dots on fingertips only (minimal visual feedback)
          // Fingertip indices: 4 (thumb), 8 (index), 12 (middle), 16 (ring), 20 (pinky)
          const fingertipIndices = [4, 8, 12, 16, 20];
          fingertipIndices.forEach(idx => {
            const kp = hand.keypoints[idx];
            if (kp) {
              ctx.beginPath();
              ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
              ctx.fillStyle = '#00ff88';
              ctx.fill();
            }
          });
          
          // Classify gesture (data recorded in background)
          const features = extractFeatures(hand);
          const result = classifyGesture(features);
          if (result && result.confidence > 0.5) {
            detectedGesture = result.gesture;
            
            // Log gesture for debugging (can be removed in production)
            console.log(`[Gesture] Detected: ${result.gesture} (${(result.confidence * 100).toFixed(0)}%)`);
          }
        });

        setCurrentGesture(detectedGesture);

        // Component Detection (throttled + ROI optimization)
        // ROI = Region of Interest - only detect in center areas (2,4,5,6,8 of 3x3 grid)
        const now = Date.now();
        if (!isDetecting && now - lastDetectionTime.current > COMPONENT_DETECTION_INTERVAL) {
          lastDetectionTime.current = now;
          setIsDetecting(true);

          // Calculate ROI - center cross pattern (areas 2,4,5,6,8)
          // This is effectively the middle 2/3 width and 2/3 height
          const roiX = Math.floor(video.videoWidth / 6);  // Start at 1/6 from left
          const roiY = Math.floor(video.videoHeight / 6); // Start at 1/6 from top
          const roiWidth = Math.floor(video.videoWidth * 2 / 3);  // 2/3 of width
          const roiHeight = Math.floor(video.videoHeight * 2 / 3); // 2/3 of height

          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = roiWidth;
          tempCanvas.height = roiHeight;
          const tempCtx = tempCanvas.getContext('2d');
          
          if (tempCtx) {
            // Draw only the ROI region
            tempCtx.drawImage(video, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);
            const base64 = tempCanvas.toDataURL('image/jpeg', 0.7); // Slightly lower quality for speed
            
            // Draw ROI indicator on main canvas (subtle)
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(roiX, roiY, roiWidth, roiHeight);
            ctx.setLineDash([]);

            try {
              const response = await fetch('http://localhost:3000/api/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64 })
              });

              if (response.ok) {
                const result = await response.json();
                console.log('YOLO Detection result:', result);
                if (result.detections) {
                  // Adjust bbox coordinates from ROI to full frame
                  const adjustedDetections = result.detections.map((det: Detection) => ({
                    ...det,
                    bbox: {
                      // Convert ROI-relative coords to full-frame coords
                      x1: (det.bbox.x1 * roiWidth + roiX) / video.videoWidth,
                      y1: (det.bbox.y1 * roiHeight + roiY) / video.videoHeight,
                      x2: (det.bbox.x2 * roiWidth + roiX) / video.videoWidth,
                      y2: (det.bbox.y2 * roiHeight + roiY) / video.videoHeight,
                    }
                  }));
                  setCurrentComponents(adjustedDetections);
                }
                if (result.error) {
                  console.warn('YOLO Error:', result.error);
                }
              }
            } catch (err) {
              console.error('Detection API error:', err);
            }
          }
          setIsDetecting(false);
        }

        // Draw component detections (only >70% confidence, blue boxes)
        // Merge overlapping boxes of same class
        const filteredDetections = currentComponents.filter(det => det.confidence >= 0.70);
        const mergedDetections: typeof filteredDetections = [];
        
        filteredDetections.forEach(det => {
          // Check if this detection overlaps with an existing merged detection
          const overlapThreshold = 0.3; // 30% overlap = same object
          let merged = false;
          
          for (let i = 0; i < mergedDetections.length; i++) {
            const existing = mergedDetections[i];
            if (existing.class !== det.class) continue;
            
            // Calculate IoU (Intersection over Union)
            const x1 = Math.max(det.bbox.x1, existing.bbox.x1);
            const y1 = Math.max(det.bbox.y1, existing.bbox.y1);
            const x2 = Math.min(det.bbox.x2, existing.bbox.x2);
            const y2 = Math.min(det.bbox.y2, existing.bbox.y2);
            
            const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
            const area1 = (det.bbox.x2 - det.bbox.x1) * (det.bbox.y2 - det.bbox.y1);
            const area2 = (existing.bbox.x2 - existing.bbox.x1) * (existing.bbox.y2 - existing.bbox.y1);
            const union = area1 + area2 - intersection;
            const iou = intersection / union;
            
            if (iou > overlapThreshold) {
              // Merge: keep the one with higher confidence
              if (det.confidence > existing.confidence) {
                mergedDetections[i] = det;
              }
              merged = true;
              break;
            }
          }
          
          if (!merged) {
            mergedDetections.push(det);
          }
        });
        
        // Draw merged detections
        mergedDetections.forEach(det => {
          const x1 = det.bbox.x1 * canvas.width;
          const y1 = det.bbox.y1 * canvas.height;
          const x2 = det.bbox.x2 * canvas.width;
          const y2 = det.bbox.y2 * canvas.height;

          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 3;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

          ctx.fillStyle = '#3b82f6';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(`${det.class} ${(det.confidence * 100).toFixed(0)}%`, x1, y1 - 5);
        });

        // Auto-verification logic
        if (isTaskActive && selectedTask) {
          const isVerified = checkStepVerification(detectedGesture, currentComponents);
          
          if (isVerified) {
            if (verificationHoldTime.current === 0) {
              verificationHoldTime.current = now;
            } else if (now - verificationHoldTime.current >= HOLD_DURATION) {
              // Step verified!
              setStepVerified(true);
              handleCompleteStep();
              verificationHoldTime.current = 0;
            }
            
            // Draw verification progress
            const progress = Math.min(1, (now - verificationHoldTime.current) / HOLD_DURATION);
            ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
            ctx.fillRect(0, canvas.height - 10, canvas.width * progress, 10);
          } else {
            verificationHoldTime.current = 0;
          }
        }
      }

      animationFrameId = requestAnimationFrame(detect);
    };

    detect();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isLive, detector, currentComponents, isTaskActive, selectedTask, currentStepIndex, extractFeatures, classifyGesture, checkStepVerification, isDetecting]);

  // Load Work Instructions and build task list
  useEffect(() => {
    if (!id) return;

    const savedWIs = localStorage.getItem('saved_work_instructions');
    const teamsData = localStorage.getItem('teams_data');
    
    if (savedWIs) {
      const wis: WorkInstruction[] = JSON.parse(savedWIs);
      setWorkInstructions(wis);
      
      let assignedWIId: string | null = null;
      if (teamsData) {
        const teams = JSON.parse(teamsData);
        const employeeTeam = teams.find((t: any) => t.memberIds?.includes(id));
        if (employeeTeam) {
          assignedWIId = employeeTeam.currentWIId;
        }
      }

      const taskList: Task[] = [];
      
      if (assignedWIId) {
        const assignedWI = wis.find(w => w.id === assignedWIId);
        if (assignedWI) {
          taskList.push({
            id: `task-${assignedWI.id}`,
            wiId: assignedWI.id,
            title: assignedWI.title,
            type: 'routine',
            frequency: (assignedWI as any).frequency || 'Daily',
            dueDate: 'Today',
            status: 'pending',
            completedSteps: 0,
            totalSteps: assignedWI.steps?.length || 0
          });
        }
      }

      taskList.push({
        id: 'calibration-monthly',
        wiId: '',
        title: 'Station Calibration',
        type: 'calibration',
        frequency: 'Monthly',
        dueDate: 'Nov 30, 2025',
        status: 'pending',
        completedSteps: 0,
        totalSteps: 3
      });

      wis.forEach(wi => {
        if (wi.id !== assignedWIId) {
          taskList.push({
            id: `available-${wi.id}`,
            wiId: wi.id,
            title: wi.title,
            type: 'one-time',
            frequency: 'As Needed',
            dueDate: '-',
            status: 'pending',
            completedSteps: 0,
            totalSteps: wi.steps?.length || 0
          });
        }
      });

      setTasks(taskList);
    } else {
      setTasks([{
        id: 'calibration-monthly',
        wiId: '',
        title: 'Station Calibration',
        type: 'calibration',
        frequency: 'Monthly',
        dueDate: 'Nov 30, 2025',
        status: 'pending',
        completedSteps: 0,
        totalSteps: 3
      }]);
    }
  }, [id]);

  // Camera Setup - Optimized resolution for inference
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      if (isLive && id === "emp-001") {
        try {
          // Use 640x480 - optimal for MobileNet/MediaPipe and YOLO inference
          // Reduces processing load significantly vs 1920x1080
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 30 }
            }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          console.log('[Performance] Camera started at optimized 640x480 resolution');
        } catch (err) {
          console.error("Error accessing webcam:", err);
          toast.error("Could not access webcam");
        }
      }
    };

    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [isLive, id]);

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    setCurrentStepIndex(0);
    setIsTaskActive(false);
    setStepVerified(false);
  };

  const handleStartTask = () => {
    if (!selectedTask) return;
    setIsTaskActive(true);
    setCurrentStepIndex(0);
    setStepVerified(false);
    toast.info("Task started! Complete the required actions.");
  };

  const handleCompleteStep = () => {
    if (!selectedTask) return;
    
    const wi = workInstructions.find(w => w.id === selectedTask.wiId);
    const totalSteps = wi?.steps?.length || selectedTask.totalSteps;
    
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setStepVerified(false);
      toast.success(`Step ${currentStepIndex + 1} verified!`);
    } else {
      setIsTaskActive(false);
      setTasks(prev => prev.map(t => 
        t.id === selectedTask.id 
          ? { ...t, status: 'completed' as const, completedSteps: totalSteps }
          : t
      ));
      setSelectedTask(prev => prev ? { ...prev, status: 'completed', completedSteps: totalSteps } : null);
      toast.success("🎉 Task Completed Successfully!");
    }
  };

  const getStepsForTask = (task: Task): WIStep[] => {
    if (task.wiId) {
      const wi = workInstructions.find(w => w.id === task.wiId);
      return wi?.steps || [];
    }
    if (task.type === 'calibration') {
      return [
        { id: '1', gestureId: null, componentId: null, description: 'Verify camera position is correct and centered' },
        { id: '2', gestureId: null, componentId: null, description: 'Check lighting conditions - ensure no shadows' },
        { id: '3', gestureId: null, componentId: null, description: 'Perform T-Pose for 3 seconds to calibrate' },
      ];
    }
    return [];
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'routine': return <PlayCircle className="w-5 h-5 text-blue-500" />;
      case 'calibration': return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default: return <Circle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
      case 'in-progress': return <Badge className="bg-blue-500">In Progress</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  // Calculate overall calibration status
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const isFullyCalibrated = completedTasks === totalTasks && totalTasks > 0;

  if (!employee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Employee Not Found</h2>
            <Button onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentTaskSteps = selectedTask ? getStepsForTask(selectedTask) : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-lg font-semibold">{employee.name}</h1>
                <p className="text-xs text-muted-foreground">{employee.position}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Calibration Status */}
              <Badge className={isFullyCalibrated ? "bg-green-500" : "bg-orange-500"}>
                {isFullyCalibrated ? "✓ All Tasks Complete" : `${completedTasks}/${totalTasks} Tasks Done`}
              </Badge>
              <Badge className={isLive ? "bg-green-500" : "bg-gray-500"}>
                {isLive ? "● LIVE" : "● OFFLINE"}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-120px)]">
          
          {/* Left: Camera + Task Details */}
          <div className="col-span-8 flex flex-col gap-4">
            {/* Camera Feed */}
            <Card className="flex-shrink-0">
              <CardContent className="p-0">
                <div className="aspect-video bg-black relative rounded-lg overflow-hidden">
                  {isLive && id === "emp-001" ? (
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
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoOff className="w-16 h-16 text-gray-600" />
                    </div>
                  )}
                  
                  {/* Model Loading Indicator */}
                  {isLoadingModel && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                        <p>Loading detection models...</p>
                      </div>
                    </div>
                  )}

                  {/* Detection Status */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge variant="secondary" className="bg-black/50 text-white">
                      <Hand className="w-3 h-3 mr-1" />
                      {handsDetected} hands
                    </Badge>
                    <Badge variant="secondary" className="bg-black/50 text-white">
                      <Box className="w-3 h-3 mr-1" />
                      {currentComponents.length} objects
                    </Badge>
                    {currentGesture && (
                      <Badge className="bg-green-500">
                        Gesture: {currentGesture}
                      </Badge>
                    )}
                  </div>

                  {/* Camera Controls */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => setIsLive(!isLive)}
                    >
                      {isLive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  {/* Task Overlay */}
                  {isTaskActive && selectedTask && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <div className="text-white">
                        <p className="text-sm opacity-70">Step {currentStepIndex + 1} of {currentTaskSteps.length}</p>
                        <p className="text-lg font-medium">{currentTaskSteps[currentStepIndex]?.description}</p>
                        {(currentTaskSteps[currentStepIndex]?.gestureId || currentTaskSteps[currentStepIndex]?.componentId) && (
                          <p className="text-sm text-green-400 mt-1">
                            Hold for 2 seconds to verify...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Task Details Panel */}
            <Card className="flex-1 overflow-hidden">
              <CardHeader className="py-3 border-b">
                <CardTitle className="text-base flex items-center justify-between">
                  {selectedTask ? (
                    <>
                      <span>{selectedTask.title}</span>
                      {getStatusBadge(selectedTask.status)}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Select a task to view details</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 overflow-auto">
                {selectedTask ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{selectedTask.frequency}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {selectedTask.dueDate}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-medium text-sm">Steps:</h3>
                      <div className="space-y-2">
                        {currentTaskSteps.map((step, index) => {
                          const gestureName = step.gestureId ? trainedGestures.find(g => g.id === step.gestureId)?.name : null;
                          const componentName = step.componentId ? trainedComponents[parseInt(step.componentId) - 1] : null;
                          
                          return (
                            <div 
                              key={step.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                                isTaskActive && index === currentStepIndex
                                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                  : index < currentStepIndex || selectedTask.status === 'completed'
                                    ? 'border-green-500/30 bg-green-500/5'
                                    : 'border-border'
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                index < currentStepIndex || selectedTask.status === 'completed'
                                  ? 'bg-green-500 text-white'
                                  : isTaskActive && index === currentStepIndex
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                              }`}>
                                {index < currentStepIndex || selectedTask.status === 'completed' ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <span className="text-xs font-bold">{index + 1}</span>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className={`text-sm ${isTaskActive && index === currentStepIndex ? 'font-medium' : ''}`}>
                                  {step.description || `Step ${index + 1}`}
                                </p>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {gestureName && (
                                    <Badge variant="outline" className="text-xs">
                                      <Hand className="w-3 h-3 mr-1" />
                                      {gestureName}
                                    </Badge>
                                  )}
                                  {componentName && (
                                    <Badge variant="outline" className="text-xs">
                                      <Box className="w-3 h-3 mr-1" />
                                      {componentName}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {!isTaskActive && selectedTask.status !== 'completed' && (
                        <Button onClick={handleStartTask} className="flex-1">
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Start Task
                        </Button>
                      )}
                      {isTaskActive && (
                        <Button onClick={handleCompleteStep} variant="outline" className="flex-1">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Skip / Manual Complete
                        </Button>
                      )}
                      {selectedTask.status === 'completed' && (
                        <Button variant="outline" disabled className="flex-1">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Completed
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p>← Select a task from the right panel</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Task List */}
          <div className="col-span-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="py-3 border-b flex-shrink-0">
                <CardTitle className="text-base">Today's Tasks</CardTitle>
              </CardHeader>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {tasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No tasks assigned</p>
                    </div>
                  ) : (
                    tasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => handleSelectTask(task)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedTask?.id === task.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        } ${task.status === 'completed' ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          {getTaskIcon(task.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm truncate">{task.title}</p>
                              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px]">
                                {task.frequency}
                              </Badge>
                              {task.status === 'completed' && (
                                <Badge className="bg-green-500 text-[10px]">Done</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {task.completedSteps}/{task.totalSteps} steps • Due: {task.dueDate}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              
              <div className="p-3 border-t flex-shrink-0 space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => navigate("/manage-team")}
                >
                  Manage WI Assignments
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => navigate("/training")}
                >
                  Train Gestures/Components
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitor;
