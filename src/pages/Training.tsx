import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Upload, Image as ImageIcon, Plus, Trash2, Tag, Database, Play, CheckCircle2, XCircle, Loader2, Eye, EyeOff, Hand, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ImageAnnotator } from "@/components/ImageAnnotator";
import { toast } from "sonner";
import * as tf from '@tensorflow/tfjs';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ClassInfo {
  id: string;
  name: string;
  count: number;
  isTrained: boolean;
  includeInTraining: boolean;
}

const Training = () => {
  const navigate = useNavigate();
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [totalEpochs, setTotalEpochs] = useState(10);
  const [loss, setLoss] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("cnn");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const detectorRef = useRef<handPoseDetection.HandDetector | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStep, setRecordingStep] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordingMessage, setRecordingMessage] = useState("");
  const lastHandsRef = useRef<handPoseDetection.Hand[]>([]);
  
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");

  const [classes, setClasses] = useState<ClassInfo[]>(() => {
    const saved = localStorage.getItem('training_classes');
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      { id: "1", name: "Motherboard", count: 450, isTrained: true, includeInTraining: true },
      { id: "2", name: "CPU", count: 320, isTrained: true, includeInTraining: true },
      { id: "3", name: "RAM Stick", count: 280, isTrained: true, includeInTraining: true },
      { id: "4", name: "GPU", count: 198, isTrained: false, includeInTraining: true },
      { id: "5", name: "Power Supply", count: 150, isTrained: false, includeInTraining: false },
    ];
  });

  const [movementClasses, setMovementClasses] = useState<ClassInfo[]>(() => {
    const saved = localStorage.getItem('movement_classes');
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      { id: "m1", name: "Hand Raise", count: 120, isTrained: true, includeInTraining: true },
      { id: "m2", name: "Waving", count: 85, isTrained: true, includeInTraining: true },
      { id: "m3", name: "Idle", count: 200, isTrained: true, includeInTraining: true },
      { id: "m4", name: "Reaching", count: 45, isTrained: false, includeInTraining: true },
    ];
  });

  useEffect(() => {
    localStorage.setItem('training_classes', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem('movement_classes', JSON.stringify(movementClasses));
  }, [movementClasses]);

  useEffect(() => {
    loadModel();
  }, []);

  const loadModel = async () => {
    setIsModelLoading(true);
    try {
      // Try to load from IndexedDB first
      const loadedModel = await tf.loadLayersModel('indexeddb://my-model');
      setModel(loadedModel);
      toast.success("Latest model loaded successfully");
    } catch (e) {
      console.log("No saved model found, creating new one...");
      // Create a simple model if none exists
      const newModel = tf.sequential();
      newModel.add(tf.layers.conv2d({
        inputShape: [224, 224, 3],
        filters: 32,
        kernelSize: 3,
        activation: 'relu',
      }));
      newModel.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
      newModel.add(tf.layers.flatten());
      newModel.add(tf.layers.dense({ units: 64, activation: 'relu' }));
      newModel.add(tf.layers.dense({ units: classes.length, activation: 'softmax' }));
      
      newModel.compile({
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy'],
      });
      
      setModel(newModel);
    } finally {
      setIsModelLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedImages(Array.from(e.target.files));
      setIsAnnotating(true);
    }
  };

  const handleSaveDataset = (data: any) => {
    console.log("Saving dataset:", data);
    
    // Update classes based on new annotations
    const newClasses = [...classes];
    data.forEach((item: any) => {
      item.annotations.forEach((ann: any) => {
        const existingClass = newClasses.find(c => c.name === ann.label);
        if (existingClass) {
          existingClass.count++;
          existingClass.isTrained = false; // New data needs training
        } else {
          newClasses.push({
            id: Math.random().toString(36).substr(2, 9),
            name: ann.label,
            count: 1,
            isTrained: false,
            includeInTraining: true
          });
        }
      });
    });
    setClasses(newClasses);

    toast.success("Dataset updated successfully!");
    setIsAnnotating(false);
    setUploadedImages([]);
  };

  const handleAddClass = () => {
    if (!newClassName.trim()) return;

    const newClass: ClassInfo = {
      id: Math.random().toString(36).substr(2, 9),
      name: newClassName,
      count: 0,
      isTrained: false,
      includeInTraining: true
    };

    if (activeTab === 'cnn') {
      setClasses([...classes, newClass]);
      toast.success(`Class "${newClassName}" added`);
    } else {
      setMovementClasses([...movementClasses, newClass]);
      toast.success(`Gesture "${newClassName}" added`);
    }

    setNewClassName("");
    setIsAddClassOpen(false);
  };

  const toggleClassTraining = (id: string, isMovement = false) => {
    if (isMovement) {
      setMovementClasses(movementClasses.map(c => 
        c.id === id ? { ...c, includeInTraining: !c.includeInTraining } : c
      ));
    } else {
      setClasses(classes.map(c => 
        c.id === id ? { ...c, includeInTraining: !c.includeInTraining } : c
      ));
    }
  };

  const startRecordingSequence = async () => {
    if (!selectedClassId) {
      toast.error("Please select a gesture class first");
      return;
    }
    
    const currentClass = movementClasses.find(c => c.id === selectedClassId);
    const samplesNeeded = (currentClass?.count || 0) === 0 ? 3 : 1;

    setIsRecording(true);
    setRecordingStep(0);
    
    try {
      for (let i = 1; i <= samplesNeeded; i++) {
        setRecordingStep(i);
        setRecordingMessage("Get Ready...");
        
        // Countdown
        for (let c = 3; c > 0; c--) {
          setCountdown(c);
          await new Promise(r => setTimeout(r, 1000));
        }
        setCountdown(null);
        
        // Wait for hand entry
        setRecordingMessage("Perform Gesture!");
        while (lastHandsRef.current.length === 0) {
            await new Promise(r => setTimeout(r, 100));
            if (!videoRef.current) throw new Error("Recording interrupted");
        }

        // Wait for hand exit (Recording phase)
        setRecordingMessage("Recording... Remove hand to finish");
        while (lastHandsRef.current.length > 0) {
            await new Promise(r => setTimeout(r, 100));
            if (!videoRef.current) throw new Error("Recording interrupted");
        }
        
        toast.success(`Sample ${i}/${samplesNeeded} recorded`);
        
        if (i < samplesNeeded) {
          setRecordingMessage("Next sample starting...");
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      
      // Update count
      setMovementClasses(prev => prev.map(c => 
        c.id === selectedClassId ? { ...c, count: c.count + samplesNeeded, isTrained: false } : c
      ));
      toast.success("All samples recorded successfully!");
    } catch (error) {
      console.error("Recording error:", error);
      // Only show error if it wasn't a clean unmount/interrupt
      if (videoRef.current) {
        toast.error("Recording failed");
      }
    } finally {
      setIsRecording(false);
      setRecordingStep(0);
      setCountdown(null);
      setRecordingMessage("");
    }
  };

  const startTraining = async (isMovement = false) => {
    if (!model && !isMovement) return; // KNN might not use the same tf model object
    
    const targetClasses = isMovement ? movementClasses : classes;
    const activeClasses = targetClasses.filter(c => c.includeInTraining);
    
    if (activeClasses.length === 0) {
      toast.error("Please select at least one class to train");
      return;
    }

    setIsTraining(true);
    setTrainingProgress(0);
    setCurrentEpoch(0);
    setLoss(null);
    setAccuracy(null);

    try {
      // Simulate training process
      const totalSteps = totalEpochs * 10;
      
      for (let epoch = 1; epoch <= totalEpochs; epoch++) {
        setCurrentEpoch(epoch);
        
        // Simulate batches
        for (let batch = 0; batch < 10; batch++) {
          await new Promise(resolve => setTimeout(resolve, isMovement ? 150 : 200)); // KNN might be faster
          const progress = ((epoch - 1) * 10 + batch + 1) / totalSteps * 100;
          setTrainingProgress(progress);
        }

        // Simulate metrics update
        setLoss(Math.max(0.1, 2.0 - (epoch * 0.15) + (Math.random() * 0.1)));
        setAccuracy(Math.min(0.99, 0.4 + (epoch * 0.05) + (Math.random() * 0.05)));
      }

      if (!isMovement && model) {
        await model.save('indexeddb://my-model');
      }
      
      // Update class status
      if (isMovement) {
        setMovementClasses(movementClasses.map(c => ({
          ...c,
          isTrained: c.includeInTraining
        })));
        toast.success("KNN Movement Model trained successfully!");
      } else {
        setClasses(classes.map(c => ({
          ...c,
          isTrained: c.includeInTraining
        })));
        toast.success("CNN Object Detection Model trained successfully!");
      }

    } catch (error) {
      console.error("Training error:", error);
      toast.error("Training failed");
    } finally {
      setIsTraining(false);
    }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const setupDetector = async () => {
      const model = handPoseDetection.SupportedModels.MediaPipeHands;
      const detectorConfig = {
        runtime: 'mediapipe' as const,
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
        modelType: 'full' as const
      };
      detectorRef.current = await handPoseDetection.createDetector(model, detectorConfig);
    };

    const detectHands = async () => {
      if (detectorRef.current && videoRef.current && videoRef.current.readyState === 4) {
        const video = videoRef.current;
        const hands = await detectorRef.current.estimateHands(video);
        lastHandsRef.current = hands;
        
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, video.videoWidth, video.videoHeight);
            canvasRef.current.width = video.videoWidth;
            canvasRef.current.height = video.videoHeight;

            hands.forEach(hand => {
              // Draw keypoints
              hand.keypoints.forEach(keypoint => {
                ctx.beginPath();
                ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = '#00FF00';
                ctx.fill();
              });
              
              // Draw skeleton (simplified)
              // You can add more elaborate drawing logic here
            });
          }
        }
      }
      animationFrameId = requestAnimationFrame(detectHands);
    };

    const startWebcam = async () => {
      if (activeTab === 'knn' && !isAnnotating) {
        try {
          await setupDetector();
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadeddata = () => {
              setIsWebcamActive(true);
              detectHands();
            };
          }
        } catch (err) {
          console.error("Error accessing webcam:", err);
          toast.error("Could not access webcam");
        }
      } else {
        setIsWebcamActive(false);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      }
    };

    startWebcam();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [activeTab, isAnnotating]);

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4 pl-0 hover:pl-2 transition-all">
          ← Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Brain className="w-10 h-10 text-primary" />
              AI Training Center
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage dataset, label images, and train your model
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg shadow-sm">
              {isModelLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
              )}
              <span className="font-medium text-sm">
                {isModelLoading ? "Loading Model..." : "Model Ready (v1.0.2)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {isAnnotating ? (
        <ImageAnnotator 
          images={uploadedImages}
          onSave={handleSaveDataset}
          onCancel={() => {
            setIsAnnotating(false);
            setUploadedImages([]);
          }}
        />
      ) : (
        <>
          {/* Training Status Overlay */}
          {isTraining && (
            <Card className="mb-8 border-primary/50 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <div>
                      <h3 className="font-semibold text-lg">Training in Progress...</h3>
                      <p className="text-sm text-muted-foreground">Epoch {currentEpoch}/{totalEpochs}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Accuracy: {accuracy ? (accuracy * 100).toFixed(1) : "--"}%</p>
                    <p className="text-sm text-muted-foreground">Loss: {loss ? loss.toFixed(4) : "--"}</p>
                  </div>
                </div>
                <Progress value={trainingProgress} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground text-right">{Math.round(trainingProgress)}%</p>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <ImageIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Images</p>
                  <p className="text-2xl font-bold">
                    {classes.reduce((acc, curr) => acc + curr.count, 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <Tag className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Classes</p>
                  <p className="text-2xl font-bold">{classes.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <Database className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trained Classes</p>
                  <p className="text-2xl font-bold">
                    {classes.filter(c => c.isTrained).length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-warning/10 rounded-lg">
                  <Play className="w-6 h-6 text-warning-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Training Status</p>
                  <p className="text-2xl font-bold">{isTraining ? "Running" : "Idle"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload Section (CNN) or Camera (KNN) */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{activeTab === 'cnn' ? "Upload New Samples" : "Live Camera Feed"}</CardTitle>
                <CardDescription>
                  {activeTab === 'cnn' 
                    ? "Select multiple images from a folder to start labeling" 
                    : "Use your camera to capture movement gestures for training"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeTab === 'cnn' ? (
                  <div className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors relative">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileSelect}
                    />
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 pointer-events-none">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 pointer-events-none">Drop images here or click to browse</h3>
                    <p className="text-muted-foreground mb-6 pointer-events-none">Support for JPG, PNG, WEBP</p>
                    <Button className="pointer-events-none">Select Files</Button>
                  </div>
                ) : (
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center border border-border group">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover"
                    />
                    {!isWebcamActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/10 backdrop-blur-sm">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    )}

                    {/* Target Class Label */}
                    <div className="absolute top-4 right-4 z-30 text-right pointer-events-none">
                      <div className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-lg border border-white/10 shadow-lg">
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mb-0.5">Target Class</p>
                        <p className="text-xl font-bold text-primary">
                          {movementClasses.find(c => c.id === selectedClassId)?.name || "None Selected"}
                        </p>
                      </div>
                    </div>

                    {/* Recording Overlay */}
                    {isRecording && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-20">
                        {countdown ? (
                          <div className="text-6xl font-bold text-white animate-bounce">{countdown}</div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-full border-4 border-red-500 flex items-center justify-center animate-pulse">
                              <div className="w-12 h-12 bg-red-500 rounded-full" />
                            </div>
                            <p className="text-white font-medium text-lg">{recordingMessage}</p>
                            <p className="text-white/70 text-sm">Sample {recordingStep}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Controls Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      {!isRecording && isWebcamActive && (
                        <Button 
                          size="lg" 
                          className="pointer-events-auto bg-red-600 hover:bg-red-700 text-white rounded-full px-8 py-6 shadow-lg transform hover:scale-105 transition-all"
                          onClick={startRecordingSequence}
                        >
                          <div className="w-4 h-4 bg-white rounded-full mr-2" />
                          {selectedClassId ? "Record Samples" : "Select Gesture to Record"}
                        </Button>
                      )}
                    </div>

                    <div className="absolute bottom-4 right-4 flex gap-2 z-10">
                       <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
                    </div>
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Classes Section */}
            <Card className="flex flex-col h-full">
              <CardHeader className="pb-2">
                <CardTitle>Model Configuration</CardTitle>
                <CardDescription>Select model type to train</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <Tabs defaultValue="cnn" className="w-full flex-1 flex flex-col" onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="cnn">Object Detection (CNN)</TabsTrigger>
                    <TabsTrigger value="knn">Movement (KNN)</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="cnn" className="flex-1 flex flex-col data-[state=active]:flex">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium">Object Classes</h3>
                      <Button size="sm" variant="outline" onClick={() => setIsAddClassOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Class
                      </Button>
                    </div>
                    
                    <div className="space-y-3 flex-1 overflow-auto max-h-[300px] pr-2">
                      {classes.map((cls) => (
                        <div key={cls.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${cls.isTrained ? 'bg-success' : 'bg-warning'}`} />
                            <div>
                              <p className="font-medium text-sm">{cls.name}</p>
                              <p className="text-xs text-muted-foreground">{cls.count} samples</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={cls.isTrained ? "default" : "secondary"} className="text-[10px]">
                              {cls.isTrained ? "Trained" : "New"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleClassTraining(cls.id, false)}
                              title={cls.includeInTraining ? "Exclude from training" : "Include in training"}
                            >
                              {cls.includeInTraining ? (
                                <Eye className="w-4 h-4 text-primary" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-border mt-auto">
                      <Button 
                        className="w-full" 
                        size="lg" 
                        onClick={() => startTraining(false)}
                        disabled={isTraining || classes.filter(c => c.includeInTraining).length === 0}
                      >
                        {isTraining && activeTab === 'cnn' ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Training CNN...
                          </>
                        ) : (
                          <>
                            <Brain className="w-4 h-4 mr-2" />
                            Train Object Model
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        {classes.filter(c => c.includeInTraining).length} classes selected
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="knn" className="flex-1 flex flex-col data-[state=active]:flex">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium">Movement Classes</h3>
                      <Button size="sm" variant="outline" onClick={() => setIsAddClassOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Gesture
                      </Button>
                    </div>
                    
                    <div className="space-y-3 flex-1 overflow-auto max-h-[300px] pr-2">
                      {movementClasses.map((cls) => (
                        <div 
                          key={cls.id} 
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                            selectedClassId === cls.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedClassId(cls.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${cls.isTrained ? 'bg-success' : 'bg-warning'}`} />
                            <div>
                              <p className="font-medium text-sm">{cls.name}</p>
                              <p className="text-xs text-muted-foreground">{cls.count} samples</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={cls.isTrained ? "default" : "secondary"} className="text-[10px]">
                              {cls.isTrained ? "Trained" : "New"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleClassTraining(cls.id, true);
                              }}
                              title={cls.includeInTraining ? "Exclude from training" : "Include in training"}
                            >
                              {cls.includeInTraining ? (
                                <Eye className="w-4 h-4 text-primary" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-border mt-auto">
                      <Button 
                        className="w-full" 
                        size="lg" 
                        variant="secondary"
                        onClick={() => startTraining(true)}
                        disabled={isTraining || movementClasses.filter(c => c.includeInTraining).length === 0}
                      >
                        {isTraining && activeTab === 'knn' ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Training KNN...
                          </>
                        ) : (
                          <>
                            <Activity className="w-4 h-4 mr-2" />
                            Train Movement Model
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        {movementClasses.filter(c => c.includeInTraining).length} gestures selected
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Add Class Dialog */}
      <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New {activeTab === 'cnn' ? "Class" : "Gesture"}</DialogTitle>
            <DialogDescription>
              Enter the name for the new {activeTab === 'cnn' ? "class" : "gesture"} you want to add.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Input 
              placeholder="Enter name..."
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="secondary" 
              onClick={() => setIsAddClassOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddClass}
              disabled={!newClassName.trim()}
            >
              Add {activeTab === 'cnn' ? "Class" : "Gesture"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Training;
