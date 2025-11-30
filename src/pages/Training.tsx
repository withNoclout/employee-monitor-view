import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Upload, Image as ImageIcon, Plus, Trash2, Tag, Database, Play, CheckCircle2, XCircle, Loader2, Eye, EyeOff, Hand, Activity, Camera, Target, Clock, Timer, AlertTriangle, FileText, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { ImageAnnotator } from "@/components/ImageAnnotator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import * as tf from '@tensorflow/tfjs';
import { motion, AnimatePresence } from "framer-motion";

import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { LossGraphCard } from "@/components/LossGraphCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GestureTrainingSummaryDialog } from "@/components/GestureTrainingSummaryDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrainingSummaryDialog } from "@/components/TrainingSummaryDialog";

interface ClassInfo {
  id: string;
  name: string;
  count: number;
  samples: number;  // Number of landmark samples
  isTrained: boolean;
  includeInTraining: boolean;
  data?: number[][];  // Array of landmark feature vectors for KNN
}

// New interface for gesture classes (sequence-based)
interface GestureClass {
  id: string;
  name: string;
  displayName: string;
  sequenceCount: number;
  totalFrames: number;
  createdAt: string;
  includeInTraining: boolean;
  isTrained: boolean;
  trainedSequenceCount?: number; // Number of sequences when last trained
  duration?: number; // Recording duration in seconds
}
interface Metric {
  epoch: number;
  totalEpochs: number;
  loss: number;
  box_loss?: number;
  cls_loss?: number;
  dfl_loss?: number;
  mAP50?: number;
  mAP50_95?: number;
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
  const [totalEpochs, setTotalEpochs] = useState(100);
  const [loss, setLoss] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'cnn' | 'knn'>('cnn');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cnnInputMode, setCnnInputMode] = useState<'upload' | 'camera' | 'multicam'>('upload');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const cnnVideoRef = useRef<HTMLVideoElement>(null);
  const [multiCamCount, setMultiCamCount] = useState(5);
  const [isMultiCamCapturing, setIsMultiCamCapturing] = useState(false);
  const [multiCamProgress, setMultiCamProgress] = useState(0);
  const [multiCamCountdown, setMultiCamCountdown] = useState<number | null>(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [showGestureSummaryDialog, setShowGestureSummaryDialog] = useState(false);
  const [summaryMetrics, setSummaryMetrics] = useState<any>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const detectorRef = useRef<handPoseDetection.HandDetector | null>(null);

  // New state for loss graph
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Refs for video and canvas
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Refs for video and canvase, setCurrentPhase] = useState(1);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [phaseDescription, setPhaseDescription] = useState("Frozen backbone - training detection head only");
  // Sequence management state
  const [managingClass, setManagingClass] = useState<string | null>(null);
  const [classSequences, setClassSequences] = useState<any[]>([]);
  const [isLoadingSequences, setIsLoadingSequences] = useState(false);

  const fetchSequences = async (className: string) => {
    setIsLoadingSequences(true);
    try {
      const response = await fetch(`http://localhost:3000/api/gestures/sequences/${className}`);
      if (response.ok) {
        const data = await response.json();
        // Sort by recorded_at descending (newest first)
        data.sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
        setClassSequences(data);
      }
    } catch (error) {
      console.error("Failed to fetch sequences:", error);
      toast.error("Failed to load sequences");
    } finally {
      setIsLoadingSequences(false);
    }
  };

  const handleDeleteSequence = async (className: string, sequenceId: string) => {
    try {
      if (!confirm("Delete this sequence?")) return;

      const response = await fetch(`http://localhost:3000/api/gestures/sequences/${className}/${sequenceId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success("Sequence deleted");
        // Refresh sequences
        fetchSequences(className);
        // Refresh class list to update counts (silent)
        fetchGestureClasses(true);
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting sequence:", error);
      toast.error("Failed to delete sequence");
    }
  };

  const [metrics, setMetrics] = useState<Metric[]>([]);
  useEffect(() => {
    if (!isTraining) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:3000/api/train/metrics');
        if (res.ok) {
          const data = await res.json();
          const newMetrics = data.metrics || [];
          setMetrics(newMetrics);

          if (data.isTrainingComplete) {
            setIsTraining(false);
            fetchClasses();
            toast.success("Training completed successfully!");

            // Fetch summary
            try {
              const summaryRes = await fetch('http://localhost:3000/api/train/summary');
              if (summaryRes.ok) {
                const summaryData = await summaryRes.json();
                setSummaryMetrics(summaryData);
                setShowSummaryDialog(true);
              }
            } catch (e) {
              console.error("Failed to fetch summary", e);
            }
          }

          if (newMetrics.length > 0) {
            const last = newMetrics[newMetrics.length - 1];
            if (last.mAP50 !== undefined) setMAP50(last.mAP50);
            if (last.mAP50_95 !== undefined) setMAP50_95(last.mAP50_95);
            if (last.loss !== undefined) setLoss(last.loss);
            if (last.epoch !== undefined) setCurrentEpoch(last.epoch);
            if (last.totalEpochs !== undefined) setTotalEpochs(last.totalEpochs);
          }
        }
      } catch (e) {
        console.error('Failed to fetch training metrics', e);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isTraining]);

  const [mAP50, setMAP50] = useState<number | null>(null);
  const [mAP50_95, setMAP50_95] = useState<number | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStep, setRecordingStep] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordingMessage, setRecordingMessage] = useState("");
  const lastHandsRef = useRef<handPoseDetection.Hand[]>([]);
  const prevHandsRef = useRef<handPoseDetection.Hand[]>([]);  // Track previous frame for velocity
  const recordingFramesRef = useRef<any[]>([]);  // Store frames during recording
  const recordingStartTimeRef = useRef<number>(0);

  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newGestureDuration, setNewGestureDuration] = useState(2); // Default 2 seconds

  // New state for gesture classes (server-synced)
  const [gestureClasses, setGestureClasses] = useState<GestureClass[]>([]);
  const [selectedGestureClass, setSelectedGestureClass] = useState<string | null>(null);
  const [isLoadingGestures, setIsLoadingGestures] = useState(false);
  const [gestureModelInfo, setGestureModelInfo] = useState<any>(null);

  // Test Gesture Detection state
  const [isTesting, setIsTesting] = useState(false);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const [testConfidence, setTestConfidence] = useState<number | null>(null);
  const [testDetectedGesture, setTestDetectedGesture] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState("");
  const [showTestResultDialog, setShowTestResultDialog] = useState(false);
  const [testResult, setTestResult] = useState<{
    gesture: string;
    confidence: number;
    detectionTimeMs: number;
    frameCount: number;
    allProbabilities: Record<string, number>;
  } | null>(null);
  const testFramesRef = useRef<any[]>([]);
  const testStartTimeRef = useRef<number>(0);

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
      { id: "m1", name: "Hand Raise", count: 0, samples: 0, isTrained: false, includeInTraining: true, data: [] },
      { id: "m2", name: "Thumbs Up", count: 0, samples: 0, isTrained: false, includeInTraining: true, data: [] },
      { id: "m3", name: "Idle", count: 0, samples: 0, isTrained: false, includeInTraining: true, data: [] },
    ];
  });

  const [mobilenetModel, setMobilenetModel] = useState<mobilenet.MobileNet | null>(null);
  const [trainingData, setTrainingData] = useState<{ embedding: tf.Tensor; label: string }[]>([]);

  // Fetch object detection classes
  const fetchClasses = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3000/api/classes');
      if (response.ok) {
        const serverClasses = await response.json();
        setClasses(prevClasses => {
          return serverClasses.map((sc: any) => {
            const existing = prevClasses.find(pc => pc.name === sc.name);
            return {
              ...sc,
              // Always use server's isTrained status
              isTrained: sc.isTrained,
              includeInTraining: existing ? existing.includeInTraining : sc.includeInTraining
            };
          });
        });
      }
    } catch (error) {
      console.error("Failed to fetch classes from server:", error);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // Fetch gesture classes from server
  const fetchGestureClasses = async (silent = false) => {
    if (!silent) setIsLoadingGestures(true);
    try {
      const [classesRes, modelRes] = await Promise.all([
        fetch('http://localhost:3000/api/gestures/classes'),
        fetch('http://localhost:3000/api/gestures/model')
      ]);

      if (classesRes.ok) {
        const serverClasses = await classesRes.json();
        let modelInfo = null;
        if (modelRes.ok) {
          modelInfo = await modelRes.json();
          setGestureModelInfo(modelInfo);
        }

        // Determine isTrained status based on model info
        const trainedClasses = modelInfo?.trained_classes || [];
        const trainedSampleCounts = modelInfo?.class_sample_counts || {};

        setGestureClasses(serverClasses.map((c: any) => {
          const wasTrainedWith = trainedClasses.includes(c.name);
          const trainedCount = trainedSampleCounts[c.name] || 0;
          // Class is trained if it was in training AND no new sequences added since
          const isTrained = wasTrainedWith && c.sequenceCount <= trainedCount;

          return {
            ...c,
            includeInTraining: true,
            isTrained: isTrained,
            trainedSequenceCount: trainedCount
          };
        }));
      }
    } catch (error) {
      console.error("Failed to fetch gesture classes:", error);
    } finally {
      if (!silent) setIsLoadingGestures(false);
    }
  };

  // Fetch gesture model info
  const fetchGestureModelInfo = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/gestures/model');
      if (response.ok) {
        const info = await response.json();
        setGestureModelInfo(info);
      }
    } catch (error) {
      console.error("Failed to fetch gesture model info:", error);
    }
  };

  // Handler to delete gesture class
  const handleDeleteGestureClass = async (className: string) => {
    try {
      // Find the class to get sequence count
      const gestureClass = gestureClasses.find(c => c.name === className);

      if (!gestureClass) {
        toast.error(`Gesture class "${className}" not found`);
        return;
      }

      // Confirm deletion
      if (!confirm(`Delete gesture class "${gestureClass.displayName || className}"?\n\nThis will permanently delete:\n• ${gestureClass.sequenceCount} sequences\n• ${gestureClass.totalFrames} frames`)) {
        return;
      }

      // Call server API to delete
      const response = await fetch(`http://localhost:3000/api/gestures/classes/${className}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete gesture class');
      }

      const result = await response.json();

      // Refresh the gesture classes list
      await fetchGestureClasses();

      toast.success(result.message || `Deleted gesture class "${className}"`);
    } catch (error) {
      console.error('Error deleting gesture class:', error);
      toast.error("Failed to delete gesture class");
    }
  };

  useEffect(() => {
    fetchGestureClasses();
    fetchGestureModelInfo();
  }, []);

  useEffect(() => {
    const loadMobileNet = async () => {
      const model = await mobilenet.load();
      setMobilenetModel(model);
      console.log("MobileNet loaded");
    };
    loadMobileNet();
    loadModel();
  }, []);

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

  const updateClassForNewSample = (className: string, currentClasses: ClassInfo[]) => {
    // Normalize class name to avoid duplicates (case-insensitive)
    const normalizedName = className.trim();
    const existingClassIndex = currentClasses.findIndex(c => c.name.toLowerCase() === normalizedName.toLowerCase());

    if (existingClassIndex >= 0) {
      // Update existing class
      const updatedClasses = [...currentClasses];
      updatedClasses[existingClassIndex] = {
        ...updatedClasses[existingClassIndex],
        count: updatedClasses[existingClassIndex].count + 1,
        isTrained: false // Mark as needing training
      };
      return updatedClasses;
    } else {
      // Add new class
      const newClass: ClassInfo = {
        id: Math.random().toString(36).substr(2, 9),
        name: normalizedName,
        count: 1,
        samples: 0,
        isTrained: false, // New class needs training
        includeInTraining: true,
        data: []
      };
      return [...currentClasses, newClass];
    }
  };

  const handleSaveDataset = async (data: any) => {
    if (!mobilenetModel) {
      toast.error("MobileNet not loaded yet");
      return;
    }

    console.log("Processing dataset:", data);
    const newTrainingData: { embedding: tf.Tensor; label: string }[] = [];
    let newClasses = [...classes];

    setIsTraining(true); // Show loading state while processing

    try {
      for (const item of data) {
        const img = new Image();
        img.crossOrigin = "anonymous";

        // Use the File object if available to create a URL, otherwise fallback to image name (which will likely fail)
        const imgSrc = item.file ? URL.createObjectURL(item.file) : item.image;
        img.src = imgSrc;

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = (e) => reject(new Error(`Failed to load image: ${item.image}`));
        });

        for (const ann of item.annotations) {
          // Crop and Infer
          try {
            const embedding = tf.tidy(() => {
              const pixels = tf.browser.fromPixels(img);

              // Calculate dimensions with clamping
              let x = Math.floor(ann.x * img.width);
              let y = Math.floor(ann.y * img.height);
              let w = Math.floor(ann.width * img.width);
              let h = Math.floor(ann.height * img.height);

              // Clamp to image boundaries
              x = Math.max(0, x);
              y = Math.max(0, y);
              w = Math.min(w, img.width - x);
              h = Math.min(h, img.height - y);

              // Ensure valid dimensions
              if (w <= 0 || h <= 0) {
                console.warn("Invalid crop dimensions after clamping:", { x, y, w, h });
                return null;
              }

              const cropped = tf.slice(pixels, [y, x, 0], [h, w, 3]);
              // Resize to 224x224 as expected by MobileNet
              const resized = tf.image.resizeBilinear(cropped, [224, 224]);
              return mobilenetModel.infer(resized, true);
            });

            if (embedding) {
              newTrainingData.push({ embedding, label: ann.label });
              newClasses = updateClassForNewSample(ann.label, newClasses);
            }
          } catch (innerError) {
            console.error(`Error processing annotation ${ann.label}:`, innerError);
            // Continue to next annotation
          }
        }

        // Clean up object URL
        if (item.file) {
          URL.revokeObjectURL(imgSrc);
        }
      }

      setTrainingData(prev => [...prev, ...newTrainingData]);
      setClasses(newClasses);

      if (newTrainingData.length > 0) {
        toast.success(`Processed ${newTrainingData.length} new samples! Model needs retraining.`);
      } else {
        toast.warning("No valid samples processed. Check console for details.");
      }
    } catch (error: any) {
      console.error("Error processing dataset:", error);
      toast.error(`Failed to process images: ${error.message || error}`);
    } finally {
      setIsTraining(false);
      setIsAnnotating(false);
      setUploadedImages([]);
      setCapturedImages([]); // Clear captured images after saving
    }
  };

  const handleAddClass = async () => {
    if (!newClassName.trim()) return;

    if (activeTab === 'cnn') {
      const newClass: ClassInfo = {
        id: Math.random().toString(36).substr(2, 9),
        name: newClassName,
        count: 0,
        samples: 0,
        isTrained: false,
        includeInTraining: true,
        data: []
      };
      setClasses([...classes, newClass]);
      toast.success(`Class "${newClassName}" added`);
    } else {
      // Add gesture class via server API
      try {
        const response = await fetch('http://localhost:3000/api/gestures/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newClassName, duration: newGestureDuration })
        });

        if (response.ok) {
          const newGesture = await response.json();
          toast.success(`Gesture "${newClassName}" added`);
          // Refresh gesture classes
          fetchGestureClasses();
        } else {
          const error = await response.json();
          toast.error(error.error || "Failed to add gesture");
        }
      } catch (error) {
        console.error("Failed to add gesture class:", error);
        toast.error("Failed to add gesture class");
      }
    }

    setNewClassName("");
    setNewGestureDuration(2);
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

  // Extract hand landmarks as relative coordinates (wrist = origin)
  // Returns { landmarks: [[x,y,z], ...] } or null if no valid data
  const extractHandLandmarks = (hand: handPoseDetection.Hand | null): { landmarks: number[][] } | null => {
    if (!hand || !hand.keypoints || hand.keypoints.length < 21) return null;

    const wrist = hand.keypoints[0];
    const landmarks = hand.keypoints.map(kp => [
      (kp.x - wrist.x) / 100,  // Normalize relative to wrist
      (kp.y - wrist.y) / 100,
      (kp as any).z || 0
    ]);

    return { landmarks };
  };

  // Calculate velocity of hand movement between two frames
  // Uses absolute wrist position (not relative landmarks)
  const calculateHandVelocity = (
    prevHands: handPoseDetection.Hand[] | null,
    currHands: handPoseDetection.Hand[]
  ): number => {
    if (!prevHands || prevHands.length === 0 || currHands.length === 0) return 0;

    let totalVelocity = 0;
    let count = 0;

    // Try to match hands between frames
    for (const currHand of currHands) {
      // Find matching hand from previous frame (same handedness)
      const prevHand = prevHands.find(h => h.handedness === currHand.handedness);
      if (!prevHand) continue;

      // Get wrist positions (keypoint 0)
      const prevWrist = prevHand.keypoints[0];
      const currWrist = currHand.keypoints[0];

      if (prevWrist && currWrist) {
        // Calculate distance moved (in pixels, then normalize by typical frame size)
        const dx = (currWrist.x - prevWrist.x) / 640; // Normalize by typical width
        const dy = (currWrist.y - prevWrist.y) / 480; // Normalize by typical height
        const distance = Math.sqrt(dx * dx + dy * dy);
        totalVelocity += distance;
        count++;
      }
    }

    return count > 0 ? totalVelocity / count : 0;
  };

  // Resample frames to exactly targetLength frames using linear interpolation
  const resampleFrames = (frames: any[], targetLength: number = 30): any[] => {
    if (frames.length === 0) return [];
    if (frames.length === targetLength) return frames;

    const resampled: any[] = [];

    for (let i = 0; i < targetLength; i++) {
      // Calculate the position in the original array
      const pos = (i / (targetLength - 1)) * (frames.length - 1);
      const lowerIdx = Math.floor(pos);
      const upperIdx = Math.min(lowerIdx + 1, frames.length - 1);
      const t = pos - lowerIdx; // Interpolation factor (0 to 1)

      const lowerFrame = frames[lowerIdx];
      const upperFrame = frames[upperIdx];

      // Interpolate landmarks
      const interpolateHand = (lower: any, upper: any) => {
        if (!lower && !upper) return null;
        if (!lower) return upper;
        if (!upper) return lower;

        const landmarks = lower.landmarks.map((lm: number[], idx: number) => {
          const ulm = upper.landmarks[idx];
          return [
            lm[0] + (ulm[0] - lm[0]) * t,
            lm[1] + (ulm[1] - lm[1]) * t,
            lm[2] + (ulm[2] - lm[2]) * t
          ];
        });

        return { landmarks };
      };

      resampled.push({
        timestamp: i * (1000 / 30), // Normalized timestamps at 30fps
        left_hand: interpolateHand(lowerFrame.left_hand, upperFrame.left_hand),
        right_hand: interpolateHand(lowerFrame.right_hand, upperFrame.right_hand)
      });
    }

    return resampled;
  };

  // Legacy function for backward compatibility
  const extractFeatures = (hand: handPoseDetection.Hand): number[] => {
    const wrist = hand.keypoints[0];
    return hand.keypoints.flatMap(kp => [
      (kp.x - wrist.x) / 100,
      (kp.y - wrist.y) / 100,
      (kp as any).z || 0
    ]);
  };

  // Simple fixed-duration gesture recording
  // Records gesture for the class's configured duration
  const startGestureRecording = async () => {
    if (!selectedGestureClass) {
      toast.error("Please select a gesture class first");
      return;
    }

    const gestureClass = gestureClasses.find(c => c.name === selectedGestureClass);
    if (!gestureClass) {
      toast.error("Invalid gesture class");
      return;
    }

    setIsRecording(true);
    recordingFramesRef.current = [];

    // Use the gesture class's duration, fallback to 2 seconds
    const classDuration = gestureClass.duration || 2;
    const RECORDING_DURATION = classDuration * 1000; // Convert to ms
    const FRAME_INTERVAL = 33;       // ~30fps

    try {
      // Phase 1: Countdown
      setRecordingMessage("Get Ready...");
      for (let c = 3; c > 0; c--) {
        setCountdown(c);
        await new Promise(r => setTimeout(r, 1000));
      }
      setCountdown(null);

      // Phase 2: Wait for hand to appear
      setRecordingMessage("Show your hand...");
      let waitTimeout = 0;
      while (lastHandsRef.current.length === 0) {
        await new Promise(r => setTimeout(r, 100));
        waitTimeout += 100;
        if (waitTimeout > 10000) throw new Error("Timeout waiting for hand");
        if (!videoRef.current) throw new Error("Recording interrupted");
      }

      // Phase 3: Record for fixed duration
      setRecordingMessage("Recording your gesture...");
      recordingStartTimeRef.current = Date.now();

      while (Date.now() - recordingStartTimeRef.current < RECORDING_DURATION) {
        const elapsed = Date.now() - recordingStartTimeRef.current;
        const hands = lastHandsRef.current;

        // Extract landmarks
        let leftHand = null;
        let rightHand = null;

        if (hands.length > 0) {
          hands.forEach(hand => {
            const handData = extractHandLandmarks(hand);
            if (hand.handedness === 'Left') leftHand = handData;
            else rightHand = handData;
          });
        }

        // Record frame (even if no hand - DTW handles missing data)
        recordingFramesRef.current.push({
          timestamp: elapsed,
          left_hand: leftHand,
          right_hand: rightHand
        });

        // Update UI
        const progress = Math.round((elapsed / RECORDING_DURATION) * 100);
        setRecordingStep(recordingFramesRef.current.length);
        setRecordingMessage(`Recording... ${progress}% (${recordingFramesRef.current.length} frames)`);

        await new Promise(r => setTimeout(r, FRAME_INTERVAL));
        if (!videoRef.current) throw new Error("Recording interrupted");
      }

      const frames = recordingFramesRef.current;

      if (frames.length < 10) {
        toast.error(`Too few frames captured (${frames.length}).`);
        return;
      }

      // Phase 4: Save to server (no resampling - DTW handles variable length)
      setRecordingMessage("Saving sequence...");
      const response = await fetch('http://localhost:3000/api/gestures/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          className: selectedGestureClass,
          frames: frames,
          metadata: {
            fps: 30,
            duration_ms: RECORDING_DURATION,
            frame_count: frames.length
          }
        })
      });

      if (response.ok) {
        toast.success(`Gesture saved! ${frames.length} frames recorded.`);
        fetchGestureClasses();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save sequence");
      }

    } catch (error: any) {
      console.error("Recording error:", error);
      toast.error(error.message || "Recording failed");
    } finally {
      setIsRecording(false);
      setRecordingStep(0);
      setCountdown(null);
      setRecordingMessage("");
      recordingFramesRef.current = [];
    }
  };

  // Simple fixed-duration gesture testing
  const testGestureDetection = async () => {
    if (!gestureModelInfo?.exists) {
      toast.error("No trained model found. Please train the model first.");
      return;
    }

    setIsTesting(true);
    testFramesRef.current = [];
    setTestConfidence(null);
    setTestDetectedGesture(null);
    setTestResult(null);

    // Use 3 seconds for testing (universal test duration)
    const TEST_DURATION = 3000;
    const FRAME_INTERVAL = 33;       // ~30fps
    const CONFIDENCE_THRESHOLD = 0.50;

    try {
      // Phase 1: Countdown from 3
      for (let c = 3; c > 0; c--) {
        setTestCountdown(c);
        await new Promise(r => setTimeout(r, 1000));
      }
      setTestCountdown(null);

      // Phase 2: Wait for hand to appear
      setTestMessage("Show your hand...");
      let waitTimeout = 0;
      while (lastHandsRef.current.length === 0) {
        await new Promise(r => setTimeout(r, 100));
        waitTimeout += 100;
        if (waitTimeout > 10000) throw new Error("Timeout waiting for hand");
        if (!videoRef.current) throw new Error("Detection interrupted");
      }

      // Phase 3: Record for fixed duration
      setTestMessage("Recording your gesture...");
      testStartTimeRef.current = Date.now();

      while (Date.now() - testStartTimeRef.current < TEST_DURATION) {
        const elapsed = Date.now() - testStartTimeRef.current;
        const hands = lastHandsRef.current;

        // Extract landmarks
        let leftHand = null;
        let rightHand = null;

        if (hands.length > 0) {
          hands.forEach(hand => {
            const handData = extractHandLandmarks(hand);
            if (hand.handedness === 'Left') leftHand = handData;
            else rightHand = handData;
          });
        }

        // Record frame
        testFramesRef.current.push({
          timestamp: elapsed,
          left_hand: leftHand,
          right_hand: rightHand
        });

        // Update UI
        const progress = Math.round((elapsed / TEST_DURATION) * 100);
        setTestDetectedGesture(`Recording... ${progress}%`);

        await new Promise(r => setTimeout(r, FRAME_INTERVAL));
        if (!videoRef.current) throw new Error("Detection interrupted");
      }

      const recordedFrameCount = testFramesRef.current.length;

      if (recordedFrameCount < 10) {
        toast.error(`Too few frames (${recordedFrameCount}).`);
        return;
      }

      // Phase 4: Classify with DTW
      setTestMessage("Analyzing gesture with DTW...");

      try {
        const response = await fetch('http://localhost:3000/api/gestures/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frames: testFramesRef.current
          })
        });

        if (response.ok) {
          const result = await response.json();
          const confidence = result.confidence || 0;
          const gesture = result.predicted_class || "Unknown";
          const allProbs = result.all_probs || {};
          const detectionTime = Date.now() - testStartTimeRef.current;

          setTestConfidence(confidence);
          setTestDetectedGesture(gesture);

          // Store result with all probabilities
          setTestResult({
            gesture: gesture,
            confidence: confidence,
            detectionTimeMs: detectionTime,
            frameCount: recordedFrameCount,
            allProbabilities: allProbs
          });

          if (confidence >= CONFIDENCE_THRESHOLD) {
            toast.success(`Detected: ${gesture} (${(confidence * 100).toFixed(1)}%)`);
          } else {
            toast.warning(`Low confidence: ${gesture} (${(confidence * 100).toFixed(1)}%)`);
          }

          // Show result dialog
          setTimeout(() => setShowTestResultDialog(true), 100);

        } else {
          const error = await response.json();
          toast.error(error.error || "Classification failed");
        }
      } catch (error) {
        console.error("Classification error:", error);
        toast.error("Failed to classify gesture");
      }

    } catch (error: any) {
      console.error("Test detection error:", error);
      toast.error(error.message || "Detection failed");
    } finally {
      setIsTesting(false);
      setTestCountdown(null);
      setTestMessage("");
      testFramesRef.current = [];
    }
  };

  // Legacy recording function for backward compatibility
  const startRecordingSequence = async () => {
    if (!selectedClassId) {
      toast.error("Please select a gesture class first");
      return;
    }

    const currentClass = movementClasses.find(c => c.id === selectedClassId);
    const samplesNeeded = (currentClass?.samples || 0) === 0 ? 5 : 1;

    setIsRecording(true);
    setRecordingStep(0);
    const recordedFeatures: number[][] = [];

    try {
      for (let i = 1; i <= samplesNeeded; i++) {
        setRecordingStep(i);
        setRecordingMessage("Get Ready...");

        for (let c = 3; c > 0; c--) {
          setCountdown(c);
          await new Promise(r => setTimeout(r, 1000));
        }
        setCountdown(null);

        setRecordingMessage("Show Gesture!");
        while (lastHandsRef.current.length === 0) {
          await new Promise(r => setTimeout(r, 100));
          if (!videoRef.current) throw new Error("Recording interrupted");
        }

        setRecordingMessage("Hold Still... Recording!");
        const captureStart = Date.now();
        while (Date.now() - captureStart < 1500) {
          if (lastHandsRef.current.length > 0) {
            const features = extractFeatures(lastHandsRef.current[0]);
            recordedFeatures.push(features);
          }
          await new Promise(r => setTimeout(r, 100));
          if (!videoRef.current) throw new Error("Recording interrupted");
        }

        toast.success(`Sample ${i}/${samplesNeeded}: captured ${recordedFeatures.length} frames`);

        if (i < samplesNeeded) {
          setRecordingMessage("Next sample starting...");
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      setMovementClasses(prev => prev.map(c => {
        if (c.id === selectedClassId) {
          const existingData = c.data || [];
          return {
            ...c,
            count: c.count + 1,
            samples: (c.samples || 0) + recordedFeatures.length,
            data: [...existingData, ...recordedFeatures],
            isTrained: true
          };
        }
        return c;
      }));
      toast.success(`Gesture recorded! Total ${recordedFeatures.length} frames captured.`);
    } catch (error) {
      console.error("Recording error:", error);
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

  const startTraining = async (isGesture: boolean) => {
    // Check if we have enough classes
    if (!isGesture) {
      if (classes.length < 1) {
        toast.error("You need at least 1 class to train the model");
        return;
      }
    } else {
      // Check for gesture sequences
      try {
        const response = await fetch('http://localhost:3000/api/gestures/sequences');
        const sequences = await response.json();
        if (sequences.length < 2) { // Minimal check
          // toast.warning("Warning: Low number of gesture sequences");
        }
      } catch (e) {
        console.error("Failed to check sequences", e);
      }
    }

    setIsTraining(true);
    setTrainingProgress(0);
    setCurrentEpoch(0);
    setTotalEpochs(100); // Default
    setLoss(0);
    setLossHistory([]);
    setPhaseDescription("Initializing training environment...");
    setMAP50(null);
    setMAP50_95(null);

    // Reset debug logs
    // setDebugLogs([]);

    try {
      const endpoint = isGesture ? 'http://localhost:3000/api/gestures/train' : 'http://localhost:3000/api/train';
      const response = await fetch(endpoint, { method: 'POST' });

      if (!response.ok) throw new Error('Failed to start training');

      // Start polling for logs
      pollIntervalRef.current = setInterval(async () => {
        try {
          const logResponse = await fetch('http://localhost:3000/api/train/logs');
          const { logs } = await logResponse.json();

          if (!logs) return;

          const lines = logs.split('\n');

          // Process all lines
          for (const rawLine of lines) {
            if (!rawLine.trim()) continue;

            // Strip ANSI color codes for cleaner parsing
            let line = rawLine.replace(/\u001b\[[0-9;]*m/g, '');

            if (line.includes('[TRAINING_COMPLETE]')) {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              toast.success("Training completed successfully!");
              if (isGesture) {
                await fetchGestureModelInfo();
                fetchGestureClasses();
                setShowGestureSummaryDialog(true);
              } else {
                // Fetch summary for CNN training
                try {
                  const summaryRes = await fetch('http://localhost:3000/api/train/summary');
                  if (summaryRes.ok) {
                    const summaryData = await summaryRes.json();
                    setSummaryMetrics(summaryData);
                    setShowSummaryDialog(true);
                  }
                } catch (e) {
                  console.error("Failed to fetch summary", e);
                }
              }
              setIsTraining(false);
              return;
            }
            if (line.includes('[TRAINING_FAILED]')) {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              throw new Error("Training process failed");
            }

            try {
              // Check for [PROGRESS] prefix and extract JSON
              let jsonStr = line;
              if (line.includes('[PROGRESS]')) {
                const parts = line.split('[PROGRESS]');
                if (parts.length > 1) {
                  jsonStr = parts[1];
                }
              }

              // Try to parse JSON progress
              const data = JSON.parse(jsonStr);

              // Handle epoch progress
              if (data.epoch !== undefined) {
                setCurrentEpoch(data.epoch);
                setTotalEpochs(data.total_epochs || 100);
                setTrainingProgress(data.progress || (data.epoch / (data.total_epochs || 100)) * 100);
                if (data.loss !== undefined) setLoss(data.loss);

                // Use val_accuracy for display (more meaningful)
                if (data.val_accuracy !== undefined) setAccuracy(data.val_accuracy);
                else if (data.accuracy !== undefined) setAccuracy(data.accuracy);

                // Update phase description with current epoch info
                setPhaseDescription(`Epoch ${data.epoch}/${data.total_epochs || 100} - Loss: ${data.loss?.toFixed(4) || '--'}`);
              }

              // Handle phase updates (CNN)
              if (data.phase) {
                setCurrentPhase(data.phase);
                setPhaseDescription(data.description || `Phase ${data.phase}`);
              }

              // Handle metrics (CNN)
              if (data.metrics) {
                if (data.metrics.map50 !== undefined) setMAP50(data.metrics.map50);
                if (data.metrics.map50_95 !== undefined) setMAP50_95(data.metrics.map50_95);
              }

            } catch (e) {
              // Not JSON, try to parse raw YOLO output
              // Example: 2/90 0G 1.714 2.579 1.869 21 640: 60%
              // Pattern: Epoch/Total Mem Box Cls DFL Instances Size
              const match = line.trim().match(/^(\d+)\/(\d+)\s+\S+\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)/);

              if (match) {
                const current = parseInt(match[1]);
                const total = parseInt(match[2]);
                const boxLoss = parseFloat(match[3]);
                const clsLoss = parseFloat(match[4]);
                const dflLoss = parseFloat(match[5]);
                const totalLoss = boxLoss + clsLoss + dflLoss;

                setCurrentEpoch(current);
                setTotalEpochs(total);
                setTrainingProgress((current / total) * 100);
                setLoss(totalLoss);

                setPhaseDescription(`Epoch ${current}/${total} - Loss: ${totalLoss.toFixed(4)}`);
              } else {
                // Try simpler epoch match if full pattern fails
                const epochMatch = line.trim().match(/^(\d+)\/(\d+)\s+/);
                if (epochMatch) {
                  const current = parseInt(epochMatch[1]);
                  const total = parseInt(epochMatch[2]);
                  setCurrentEpoch(current);
                  setTotalEpochs(total);
                  setTrainingProgress((current / total) * 100);
                }
              }
            }
          }

          // Re-build loss history from scratch to avoid duplicates since we read the whole file
          // This is inefficient but robust for small log files (training logs aren't huge)
          const newLossHistory: number[] = [];
          for (const rawLine of lines) {
            const line = rawLine.replace(/\u001b\[[0-9;]*m/g, '');
            const match = line.trim().match(/^(\d+)\/(\d+)\s+\S+\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)/);
            if (match) {
              const boxLoss = parseFloat(match[3]);
              const clsLoss = parseFloat(match[4]);
              const dflLoss = parseFloat(match[5]);
              newLossHistory.push(boxLoss + clsLoss + dflLoss);
            } else {
              // Try JSON format
              try {
                let jsonStr = line;
                if (line.includes('[PROGRESS]')) {
                  const parts = line.split('[PROGRESS]');
                  if (parts.length > 1) jsonStr = parts[1];
                }
                const data = JSON.parse(jsonStr);
                if (data.val_loss !== undefined) newLossHistory.push(data.val_loss);
                else if (data.loss !== undefined) newLossHistory.push(data.loss);
              } catch (e) { }
            }
          }
          if (newLossHistory.length > 0) {
            setLossHistory(newLossHistory);
          }

        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 1000);

      // The polling loop will see [TRAINING_FAILED] and stop itself.
      // But we should also store it in a ref to clear on unmount.

    } catch (error: any) {
      console.error("Training error:", error);
      if (error.name !== 'AbortError') {
        toast.error(error.message || "Training failed");
      }
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
                ctx.arc(keypoint.x, keypoint.y, 2.5, 0, 2 * Math.PI);
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

  const handleNavigateToLabel = useCallback((imagesToProcess?: string[]) => {
    const images = imagesToProcess || capturedImages;
    if (images.length > 0) {
      const files = images.map((dataUrl, index) => {
        const byteString = atob(dataUrl.split(',')[1]);
        const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        return new File([ab], `capture-${Date.now()}-${index}.png`, { type: mimeString });
      });
      setUploadedImages(files);
      setIsAnnotating(true);
      setCapturedImages([]); // Clear captured images after passing to annotator
    } else {
      toast.warning("No images captured to label.");
    }
  }, [capturedImages]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCnnWebcam = async () => {
      if (activeTab === 'cnn' && (cnnInputMode === 'camera' || cnnInputMode === 'multicam') && !isAnnotating) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (cnnVideoRef.current) {
            cnnVideoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Error accessing webcam:", err);
          toast.error("Could not access webcam");
        }
      } else {
        if (cnnVideoRef.current && cnnVideoRef.current.srcObject) {
          (cnnVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
          cnnVideoRef.current.srcObject = null;
        }
      }
    };

    startCnnWebcam();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeTab, cnnInputMode, isAnnotating]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleEmergencyStop = async () => {
    if (!isTraining) return;

    try {
      const endpoint = activeTab === 'knn'
        ? 'http://localhost:3000/api/gestures/train/cancel'
        : 'http://localhost:3000/api/train/cancel';

      const response = await fetch(endpoint, { method: 'POST' });

      if (response.ok) {
        toast.error("Training stopped by user (Emergency Stop)");
        setIsTraining(false);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      } else {
        toast.error("Failed to stop training");
      }
    } catch (error) {
      console.error("Error stopping training:", error);
      toast.error("Failed to connect to server");
    }
  };

  const handleBackNavigation = () => {
    if (isTraining) {
      handleEmergencyStop();
    }
    navigate(-1);
  };

  const captureCnnImage = () => {
    if (cnnVideoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = cnnVideoRef.current.videoWidth;
      canvas.height = cnnVideoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(cnnVideoRef.current, 0, 0);
      }
    };
  };

  const startMultiCamCapture = async () => {
    if (!cnnVideoRef.current) return;
    setIsMultiCamCapturing(true);
    setMultiCamProgress(0);
    const localCapturedImages: string[] = [];

    for (let i = 0; i < multiCamCount; i++) {
      // 3 second countdown
      for (let c = 3; c > 0; c--) {
        setMultiCamCountdown(c);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setMultiCamCountdown(null);

      // Capture
      if (cnnVideoRef.current) {
        const canvas = document.createElement("canvas");
        canvas.width = cnnVideoRef.current.videoWidth;
        canvas.height = cnnVideoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(cnnVideoRef.current, 0, 0);
          const dataUrl = canvas.toDataURL("image/png");
          localCapturedImages.push(dataUrl);
          setCapturedImages(prev => [...prev, dataUrl]);
          setMultiCamProgress(i + 1);

          // Flash effect
          setIsFlashing(true);
          setTimeout(() => setIsFlashing(false), 150);
        }
      }
    }

    setIsMultiCamCapturing(false);
    handleNavigateToLabel(localCapturedImages);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={handleBackNavigation} className="mb-4 pl-0 hover:pl-2 transition-all">
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
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={async () => {
                try {
                  const summaryRes = await fetch('http://localhost:3000/api/train/summary');
                  if (summaryRes.ok) {
                    const summaryData = await summaryRes.json();
                    setSummaryMetrics(summaryData);
                    setShowSummaryDialog(true);
                  } else {
                    toast.error("No training results found");
                  }
                } catch (e) {
                  toast.error("Failed to fetch summary");
                }
              }}
            >
              <FileText className="w-4 h-4" />
              View Report
            </Button>
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

      <TrainingSummaryDialog
        isOpen={showSummaryDialog}
        onClose={() => setShowSummaryDialog(false)}
        metrics={summaryMetrics}
      />

      <GestureTrainingSummaryDialog
        open={showGestureSummaryDialog}
        onOpenChange={setShowGestureSummaryDialog}
        modelInfo={gestureModelInfo}
      />

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
                      <h3 className="font-semibold text-lg">
                        {activeTab === 'knn' ? 'Training GRU Model...' : 'Training in Progress...'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {activeTab === 'knn'
                          ? `Epoch ${currentEpoch}/${totalEpochs}`
                          : `Phase ${currentPhase}: ${phaseDescription}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {activeTab === 'knn' ? (
                      <>
                        <p className="text-sm font-medium">Accuracy: {accuracy ? (accuracy * 100).toFixed(1) : "--"}%</p>
                        <p className="text-sm text-muted-foreground">Loss: {loss ? loss.toFixed(4) : "--"}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium">mAP50: {mAP50 ? (mAP50 * 100).toFixed(1) : "--"}%</p>
                        <p className="text-sm text-muted-foreground">mAP50-95: {mAP50_95 ? (mAP50_95 * 100).toFixed(1) : "--"}%</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress Bar for GRU, Loss Graph for CNN */}
                {activeTab === 'knn' ? (
                  <div className="space-y-2">
                    <Progress value={trainingProgress} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress: {trainingProgress.toFixed(1)}%</span>
                      <span>Epoch {currentEpoch} of {totalEpochs}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LossGraphCard
                      title="Total Loss"
                      data={metrics}
                      xKey="epoch"
                      yKey="loss"
                      color="hsl(var(--primary))"
                    />
                    <LossGraphCard
                      title="mAP50 Accuracy"
                      data={metrics}
                      xKey="epoch"
                      yKey="mAP50"
                      color="#10b981"
                    />
                  </div>
                )}


              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-border/50 shadow-industrial">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg border-2 border-border/50 bg-muted/30 backdrop-blur-sm flex items-center justify-center shadow-sm">
                  <ImageIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Total Images</p>
                  <p className="text-2xl font-bold tracking-tight tabular-nums">
                    {classes.reduce((acc, curr) => acc + curr.count, 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-industrial">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg border-2 border-border/50 bg-muted/30 backdrop-blur-sm flex items-center justify-center shadow-sm">
                  <Tag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Classes</p>
                  <p className="text-2xl font-bold tracking-tight tabular-nums">{classes.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-industrial">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg border-2 border-border/50 bg-muted/30 backdrop-blur-sm flex items-center justify-center shadow-sm">
                  <Database className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Trained Classes</p>
                  <p className="text-2xl font-bold tracking-tight tabular-nums">
                    {classes.filter(c => c.isTrained).length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-industrial">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg border-2 border-border/50 bg-muted/30 backdrop-blur-sm flex items-center justify-center shadow-sm">
                  <Play className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Training Status</p>
                  <p className="text-2xl font-bold tracking-tight">{isTraining ? "Running" : "Idle"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload Section (CNN) or Camera (KNN) */}
            <Card className="lg:col-span-2 glass-effect shadow-industrial-lg border-border/40">
              <CardHeader className="border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold tracking-wide uppercase">
                      {activeTab === 'cnn' ? "Add New Samples" : "Live Camera Feed"}
                    </CardTitle>
                    <CardDescription className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
                      {activeTab === 'cnn'
                        ? "Upload images or capture from webcam to label"
                        : "Use your camera to capture movement gestures for training"}
                    </CardDescription>
                  </div>
                  {activeTab === 'cnn' && (
                    <div className="flex items-center glass-effect rounded-lg p-1 shadow-sm border border-border/30">
                      <Button
                        variant={cnnInputMode === 'upload' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setCnnInputMode('upload')}
                        className="h-8 font-bold uppercase text-xs shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5 mr-2" />
                        Upload
                      </Button>
                      <Button
                        variant={cnnInputMode === 'camera' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setCnnInputMode('camera')}
                        className="h-8 font-bold uppercase text-xs shadow-sm"
                      >
                        <Camera className="w-3.5 h-3.5 mr-2" />
                        Camera
                      </Button>
                      <Button
                        variant={cnnInputMode === 'multicam' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setCnnInputMode('multicam')}
                        className="h-8 font-bold uppercase text-xs shadow-sm"
                      >
                        <Timer className="w-3.5 h-3.5 mr-2" />
                        Multi-Cam
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {activeTab === 'cnn' ? (
                  cnnInputMode === 'upload' ? (
                    <div className="border-2 border-dashed border-border/40 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:bg-muted/30 transition-all duration-300 relative glass-effect shadow-sm">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileSelect}
                      />
                      <div className="w-20 h-20 glass-effect border-2 border-border/50 rounded-2xl flex items-center justify-center mb-6 pointer-events-none shadow-industrial">
                        <Upload className="w-10 h-10 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold tracking-wide uppercase mb-2 pointer-events-none">Drop images here or click to browse</h3>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-6 pointer-events-none">Support for JPG, PNG, WEBP</p>
                      <Button className="pointer-events-none font-bold uppercase shadow-industrial">
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Select Files
                      </Button>
                    </div>
                  ) : cnnInputMode === 'camera' ? (
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center border-2 border-border/40 shadow-industrial-lg">
                      <video
                        ref={cnnVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
                        <Button
                          onClick={captureCnnImage}
                          size="lg"
                          className="rounded-full shadow-industrial-lg glass-effect font-bold uppercase tracking-wide hover:scale-105 transition-transform"
                        >
                          <Camera className="w-5 h-5 mr-2" />
                          Capture & Label
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Multi-Cam Mode
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center border-2 border-border/40 shadow-industrial-lg">
                      <video
                        ref={cnnVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />

                      {/* Overlay for Countdown */}
                      {multiCamCountdown !== null && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 backdrop-blur-sm">
                          <div className="text-9xl font-bold text-white animate-pulse">{multiCamCountdown}</div>
                        </div>
                      )}

                      {/* Flash Overlay */}
                      <div
                        className={`absolute inset-0 bg-white z-30 pointer-events-none transition-opacity duration-150 ${isFlashing ? 'opacity-100' : 'opacity-0'}`}
                      />

                      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center justify-center z-10 gap-4">
                        {!isMultiCamCapturing ? (
                          <div className="flex items-center gap-4 bg-black/60 p-2 rounded-full backdrop-blur-md border border-white/10">
                            <span className="text-white text-xs font-bold uppercase ml-3">Count:</span>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={multiCamCount}
                              onChange={(e) => setMultiCamCount(parseInt(e.target.value) || 1)}
                              className="w-16 h-8 bg-white/10 border border-white/20 rounded-md text-center text-white font-bold focus:outline-none focus:border-primary"
                            />
                            <Button
                              onClick={startMultiCamCapture}
                              size="lg"
                              className="rounded-full shadow-industrial-lg glass-effect font-bold uppercase tracking-wide hover:scale-105 transition-transform"
                            >
                              <Camera className="w-5 h-5 mr-2" />
                              Start Sequence
                            </Button>
                          </div>
                        ) : (
                          <div className="bg-black/60 px-6 py-3 rounded-full backdrop-blur-md border border-white/10">
                            <p className="text-white font-bold uppercase tracking-widest text-sm">
                              Capturing {multiCamProgress} / {multiCamCount}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
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
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mb-0.5">Target Gesture</p>
                        <p className="text-xl font-bold text-primary">
                          {gestureClasses.find(c => c.name === selectedGestureClass)?.displayName || selectedGestureClass || "None Selected"}
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
                            <p className="text-white/70 text-sm">{recordingStep > 0 ? `${recordingStep} frames` : ""}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Test Detection Overlay */}
                    {isTesting && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-20">
                        {testCountdown ? (
                          <div className="text-6xl font-bold text-white animate-bounce">{testCountdown}</div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-full border-4 border-blue-500 flex items-center justify-center animate-pulse">
                              <Target className="w-8 h-8 text-blue-400" />
                            </div>
                            <p className="text-white font-medium text-lg">{testMessage}</p>
                            <p className="text-white/70 text-sm">{testFramesRef.current.length} frames captured</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Live Confidence Display (top-right during testing) */}
                    {isTesting && testConfidence !== null && (
                      <div className="absolute top-4 left-4 z-30 pointer-events-none">
                        <div className={`backdrop-blur-md text-white px-4 py-3 rounded-lg border shadow-lg ${testConfidence >= 0.8 ? 'bg-green-600/80 border-green-400/30' : 'bg-black/60 border-white/10'
                          }`}>
                          <p className="text-[10px] text-zinc-300 uppercase tracking-wider font-bold mb-0.5">Detected Gesture</p>
                          <p className="text-xl font-bold">{testDetectedGesture || "..."}</p>
                          <p className="text-sm mt-1">Confidence: <span className={`font-bold ${testConfidence >= 0.8 ? 'text-green-300' : 'text-yellow-400'}`}>
                            {(testConfidence * 100).toFixed(1)}%
                          </span></p>
                        </div>
                      </div>
                    )}

                    {/* Controls Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      {!isRecording && !isTesting && isWebcamActive && (
                        <div className="flex flex-col items-center gap-3">
                          {/* Show selected gesture's duration */}
                          {selectedGestureClass && (() => {
                            const selectedClass = gestureClasses.find(c => c.name === selectedGestureClass);
                            const duration = selectedClass?.duration || 2;
                            return (
                              <div className="pointer-events-auto flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-full px-4 py-2">
                                <span className="text-white text-sm">Recording Duration: <span className="font-bold text-red-400">{duration}s</span></span>
                              </div>
                            );
                          })()}
                          <div className="flex gap-4">
                            <Button
                              size="lg"
                              className="pointer-events-auto bg-red-600 hover:bg-red-700 text-white rounded-full px-8 py-6 shadow-lg transform hover:scale-105 transition-all"
                              onClick={startGestureRecording}
                            >
                              <div className="w-4 h-4 bg-white rounded-full mr-2" />
                              {selectedGestureClass
                                ? `Record ${gestureClasses.find(c => c.name === selectedGestureClass)?.duration || 2}s`
                                : "Select Gesture First"}
                            </Button>
                            {gestureModelInfo?.exists && (
                              <Button
                                size="lg"
                                className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-6 shadow-lg transform hover:scale-105 transition-all"
                                onClick={testGestureDetection}
                              >
                                <Target className="w-5 h-5 mr-2" />
                                Test Gesture
                              </Button>
                            )}
                          </div>
                        </div>
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
            <Card className="flex flex-col h-full border-border/50 shadow-industrial glass-effect">
              <CardHeader className="pb-4 border-b border-border/30">
                <CardTitle className="text-lg font-bold tracking-tight">Model Configuration</CardTitle>
                <CardDescription className="text-[11px] uppercase tracking-widest font-medium">Select model type to train</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4 pt-4">
                <Tabs value={activeTab} className="w-full flex-1 flex flex-col" onValueChange={(val) => setActiveTab(val as 'cnn' | 'knn')}>
                  <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/30 p-1">
                    <TabsTrigger value="cnn" className="text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-sm">CNN</TabsTrigger>
                    <TabsTrigger value="knn" className="text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-sm">KNN</TabsTrigger>
                  </TabsList>

                  <div className="relative flex-1 overflow-hidden flex flex-col">
                    <AnimatePresence mode="wait">
                      {activeTab === 'cnn' ? (
                        <motion.div
                          key="cnn"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.2 }}
                          className="flex-1 flex flex-col"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Object Classes</h3>
                            <Button size="sm" variant="outline" onClick={() => setIsAddClassOpen(true)} className="h-7 text-xs">
                              <Plus className="w-3 h-3 mr-1.5" />
                              Add
                            </Button>
                          </div>

                          <ScrollArea className="flex-1 pr-2">
                            {classes.map((cls) => (
                              <div key={cls.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors group shadow-sm">
                                <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full shadow-sm ${cls.isTrained ? 'bg-success' : 'bg-warning'}`} />
                                  <div>
                                    <p className="font-bold text-sm tracking-tight">{cls.name}</p>
                                    <span className="text-xs text-muted-foreground font-mono">
                                      {cls.count} samples
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {cls.isTrained && (
                                    <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] uppercase">
                                      Trained
                                    </Badge>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (confirm(`Are you sure you want to delete class "${cls.name}"? This may invalidate existing annotations.`)) {
                                        try {
                                          const res = await fetch(`http://localhost:3000/api/classes/${cls.name}`, {
                                            method: 'DELETE'
                                          });
                                          if (res.ok) {
                                            toast.success(`Class "${cls.name}" deleted`);
                                            fetchClasses();
                                          } else {
                                            toast.error("Failed to delete class");
                                          }
                                        } catch (err) {
                                          console.error(err);
                                          toast.error("Error deleting class");
                                        }
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </ScrollArea>
                          <div className="pt-4 border-t border-border/30 mt-auto">
                            <Button
                              className="w-full h-11 font-bold uppercase tracking-wider text-xs shadow-sm"
                              onClick={() => startTraining(false)}
                              disabled={isTraining || classes.filter(c => c.includeInTraining).length === 0}
                            >
                              {isTraining && activeTab === 'cnn' ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Training...
                                </>
                              ) : (
                                <>
                                  <Brain className="w-4 h-4 mr-2" />
                                  Train Model
                                </>
                              )}
                            </Button>
                            {isTraining && activeTab === 'cnn' && (
                              <Button
                                className="w-full h-11 font-bold uppercase tracking-wider text-xs shadow-sm mt-2 bg-destructive hover:bg-destructive/90 animate-pulse"
                                onClick={handleEmergencyStop}
                              >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Emergency Stop
                              </Button>
                            )}
                            <p className="text-[10px] text-muted-foreground text-center mt-2 uppercase tracking-wider tabular-nums">
                              {classes.filter(c => c.includeInTraining).length} classes selected
                            </p>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="knn"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                          className="flex-1 flex flex-col"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Gesture Classes (GRU)</h3>
                            <Button size="sm" variant="outline" onClick={() => setIsAddClassOpen(true)} className="h-7 text-xs">
                              <Plus className="w-3 h-3 mr-1.5" />
                              Add
                            </Button>
                          </div>

                          {isLoadingGestures ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                          ) : gestureClasses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                              <div className="w-12 h-12 rounded-lg border-2 border-border/50 bg-muted/30 flex items-center justify-center mb-3">
                                <Hand className="w-6 h-6 text-muted-foreground" />
                              </div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">No gesture classes yet</p>
                              <p className="text-[10px] text-muted-foreground mt-1">Click "Add" to create one</p>
                            </div>
                          ) : (
                            <ScrollArea className="flex-1 pr-2">
                              {gestureClasses.map((cls) => (
                                <div
                                  key={cls.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer shadow-sm group ${selectedGestureClass === cls.name
                                    ? 'border-primary/50 bg-primary/10'
                                    : 'border-border/40 bg-muted/20 hover:bg-muted/40'
                                    }`}
                                  onClick={() => setSelectedGestureClass(cls.name)}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full shadow-sm ${cls.isTrained ? 'bg-success' : 'bg-warning'}`} />
                                    <div>
                                      <p className="font-bold text-sm tracking-tight">{cls.displayName || cls.name}</p>
                                      <span className="text-xs text-muted-foreground font-mono">
                                        {cls.sequenceCount} seq • {cls.totalFrames} frames
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={cls.isTrained ? "default" : "secondary"} className="text-[9px] uppercase tracking-wider font-bold">
                                      {cls.isTrained ? "Trained" : "New"}
                                    </Badge>
                                    {cls.sequenceCount < 5 && (
                                      <Badge variant="outline" className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">
                                        +{5 - cls.sequenceCount}
                                      </Badge>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setManagingClass(cls.name);
                                        fetchSequences(cls.name);
                                      }}
                                      title="Manage Sequences (Undo)"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteGestureClass(cls.name);
                                      }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </ScrollArea>
                          )}

                          {/* Model Info */}
                          {gestureModelInfo?.exists && (
                            <div className="bg-muted/30 border border-border/30 rounded-lg p-3 mb-3 shadow-sm">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Trained Model</p>
                              <p className="text-sm font-bold tabular-nums">Accuracy: {((gestureModelInfo.final_accuracy || 0) * 100).toFixed(1)}%</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider tabular-nums">{gestureModelInfo.num_classes} classes • {gestureModelInfo.total_samples} samples</p>
                            </div>
                          )}

                          <div className="pt-4 border-t border-border/30 mt-auto">
                            <Button
                              className="w-full h-11 font-bold uppercase tracking-wider text-xs shadow-sm"
                              onClick={() => startTraining(true)}
                              disabled={isTraining || gestureClasses.length < 2}
                            >
                              {isTraining && activeTab === 'knn' ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Training...
                                </>
                              ) : (
                                <>
                                  <Brain className="w-4 h-4 mr-2" />
                                  Train Model
                                </>
                              )}
                            </Button>
                            {isTraining && activeTab === 'knn' && (
                              <Button
                                className="w-full h-11 font-bold uppercase tracking-wider text-xs shadow-sm mt-2 bg-destructive hover:bg-destructive/90 animate-pulse"
                                variant="destructive"
                                onClick={handleEmergencyStop}
                              >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Emergency Stop
                              </Button>
                            )}
                            <p className="text-[10px] text-muted-foreground text-center mt-2 uppercase tracking-wider tabular-nums">
                              {gestureClasses.length} classes • {gestureClasses.reduce((sum, c) => sum + c.sequenceCount, 0)} sequences
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </>
      )
      }

      {/* Test Result Dialog */}
      <Dialog open={showTestResultDialog} onOpenChange={setShowTestResultDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Gesture Detection Complete
            </DialogTitle>
            <DialogDescription>
              AI successfully recognized your gesture
            </DialogDescription>
          </DialogHeader>
          {testResult && (
            <div className="space-y-4">
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Detected Gesture</p>
                <p className="text-2xl font-bold text-primary">{testResult.gesture}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Target className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-bold text-green-500">{(testResult.confidence * 100).toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Confidence</p>
                </div>

                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Timer className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-bold">{(testResult.detectionTimeMs / 1000).toFixed(2)}s</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Detection Time</p>
                </div>

                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-bold">{testResult.frameCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Frames Used</p>
                </div>
              </div>

              <div className="text-sm text-muted-foreground text-center">
                <p>Detection speed: ~{Math.round(testResult.detectionTimeMs / testResult.frameCount)}ms per frame</p>
              </div>

              {/* All Gesture Probabilities */}
              {testResult.allProbabilities && Object.keys(testResult.allProbabilities).length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 text-center">All Predictions</p>
                  <div className="space-y-2">
                    {Object.entries(testResult.allProbabilities)
                      .sort(([, a], [, b]) => b - a)
                      .map(([gestureName, prob]) => (
                        <div key={gestureName} className="flex items-center gap-2">
                          <span className={`text-sm font-medium w-24 truncate ${gestureName === testResult.gesture ? 'text-primary' : 'text-muted-foreground'}`}>
                            {gestureName}
                          </span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${gestureName === testResult.gesture ? 'bg-primary' : 'bg-muted-foreground/50'}`}
                              style={{ width: `${(prob as number) * 100}%` }}
                            />
                          </div>
                          <span className={`text-sm w-14 text-right ${gestureName === testResult.gesture ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                            {((prob as number) * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowTestResultDialog(false)}>
              Close
            </Button>
            <Button variant="outline" onClick={() => {
              setShowTestResultDialog(false);
              testGestureDetection();
            }}>
              Test Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <Input
                placeholder="Enter name..."
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
              />
            </div>
            {activeTab !== 'cnn' && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Recording Duration</label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setNewGestureDuration(sec)}
                      className={`flex-1 py-2 rounded-md text-sm font-medium transition-all border ${newGestureDuration === sec
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted hover:bg-muted/80 border-border'
                        }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">How long to record each sample of this gesture</p>
              </div>
            )}
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

      {/* Manage Sequences Dialog */}
      <Dialog open={!!managingClass} onOpenChange={(open) => !open && setManagingClass(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Sequences: {managingClass}</DialogTitle>
            <DialogDescription>
              View and manage recorded sequences for this gesture class.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-[300px] max-h-[500px] overflow-hidden flex flex-col">
            {isLoadingSequences ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : classSequences.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <Database className="w-10 h-10 mb-2 opacity-20" />
                <p>No sequences recorded yet</p>
              </div>
            ) : (
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-2">
                  {classSequences.map((seq, idx) => (
                    <div key={seq.sequence_id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {classSequences.length - idx}
                        </div>
                        <div>
                          <p className="text-sm font-medium font-mono">{seq.sequence_id}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                            <span>{seq.frame_count} frames</span>
                            <span>•</span>
                            <span>{new Date(seq.recorded_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDeleteSequence(managingClass!, seq.sequence_id)}
                        title="Delete Sequence"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setManagingClass(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default Training;
