import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Video, VideoOff, CheckCircle2, Circle, PlayCircle, Clock, Calendar, ChevronRight, AlertCircle, Hand, Box, Loader2, Mic, MicOff, Volume2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
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
  speechPhrase?: string;  // What the employee should say
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

  // Permission State
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [permissionsChecked, setPermissionsChecked] = useState(false);

  // Task State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [workInstructions, setWorkInstructions] = useState<WorkInstruction[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isTaskActive, setIsTaskActive] = useState(false);

  // Countdown & Step Verification State
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStartTime, setVerificationStartTime] = useState<number | null>(null);
  const VERIFICATION_DURATION = 10000; // 10 seconds total (3s gesture + 7s speech/component)
  const GESTURE_RECORD_DURATION = 3000; // First 3 seconds for gesture recording
  const [isRecordingGesture, setIsRecordingGesture] = useState(false); // True during gesture recording phase
  const [gestureRecordingComplete, setGestureRecordingComplete] = useState(false); // True after gesture is classified

  // Karaoke State
  const [karaokeWords, setKaraokeWords] = useState<string[]>([]);
  const [spokenWords, setSpokenWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

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

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [interimText, setInterimText] = useState(""); // Real-time interim results
  const [speechVerified, setSpeechVerified] = useState(false);
  const [gestureVerified, setGestureVerified] = useState(false);
  const [componentVerified, setComponentVerified] = useState(false);
  const [lockedGesture, setLockedGesture] = useState<string | null>(null); // First high-confidence gesture detected
  const [lockedComponent, setLockedComponent] = useState<string | null>(null); // First high-confidence component detected
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false); // Track listening state for callbacks;

  // DTW Gesture Sequence Collection
  const gestureFramesRef = useRef<any[]>([]); // Collect frames for DTW (same format as Training.tsx)
  const lastGestureApiCall = useRef<number>(0);
  const GESTURE_API_INTERVAL = 500; // Call DTW API every 500ms
  const MIN_FRAMES_FOR_DTW = 10; // Minimum frames before calling API
  const gestureStartTimeRef = useRef<number>(0);
  const isClassifyingGestureRef = useRef<boolean>(false); // Prevent multiple classify calls

  // Test Gesture State
  const [isTestingGesture, setIsTestingGesture] = useState(false);
  const [testGestureCountdown, setTestGestureCountdown] = useState<number | null>(null);
  const [testGestureResult, setTestGestureResult] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const testGestureFramesRef = useRef<any[]>([]); // Same format as Training.tsx
  const testStartTimeRef = useRef<number>(0);
  const lastHandsRef = useRef<handPoseDetection.Hand[]>([]); // Store last detected hands

  // Confidence threshold for locking gesture/component
  const LOCK_CONFIDENCE = 0.5; // 50% confidence to lock in (same as DTW threshold)

  // Performance optimization - frame skipping
  const frameCountRef = useRef<number>(0);
  const HAND_FRAME_SKIP = 1; // Process every frame = full fps hand detection
  // This gives maximum hand tracking responsiveness

  // Adaptive component detection frequency
  const FAST_DETECTION_INTERVAL = 500;  // ms - when searching for objects
  const SLOW_DETECTION_INTERVAL = 2000; // ms - when object already found (>70%)
  const detectionIntervalRef = useRef<number>(FAST_DETECTION_INTERVAL);

  const employee = id ? employeeData[id] : null;

  // Request permissions on mount - ensures we have camera + mic before tasks start
  useEffect(() => {
    const requestPermissions = async () => {
      // Check and request camera permission
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraStream.getTracks().forEach(track => track.stop()); // Stop immediately, just checking
        setCameraPermission('granted');
        console.log('[Permissions] Camera permission granted');
      } catch (err) {
        console.error('[Permissions] Camera permission denied:', err);
        setCameraPermission('denied');
        toast.error("Camera permission denied. Please allow camera access.");
      }

      // Check and request microphone permission
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream.getTracks().forEach(track => track.stop()); // Stop immediately, just checking
        setMicPermission('granted');
        console.log('[Permissions] Microphone permission granted');
      } catch (err) {
        console.error('[Permissions] Microphone permission denied:', err);
        setMicPermission('denied');
        toast.error("Microphone permission denied. Please allow microphone access.");
      }

      setPermissionsChecked(true);
    };

    // Only request for emp-001 (the live user)
    if (id === "emp-001") {
      requestPermissions();
    } else {
      setPermissionsChecked(true);
    }
  }, [id]);

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

  // Initialize Speech Recognition - only once on mount
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Speech recognition started');
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      console.log('Speech result:', { final: finalTranscript, interim: interimTranscript });

      // Update interim text immediately (shows real-time what's being heard)
      setInterimText(interimTranscript);

      // Append final transcript to spoken text
      if (finalTranscript.trim()) {
        setSpokenText(prev => (prev + ' ' + finalTranscript).trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      // Don't stop on 'no-speech' or 'aborted' - these are expected
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        toast.error(`Speech error: ${event.error}`);
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended, isListening:', isListeningRef.current);
      // Auto-restart if we're still supposed to be listening
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.log('Could not restart recognition:', e);
        }
      }
    };

    recognitionRef.current = recognition;
    console.log('Speech recognition initialized');

    return () => {
      if (recognitionRef.current) {
        isListeningRef.current = false;
        recognitionRef.current.stop();
      }
    };
  }, []); // Empty deps - only initialize once

  // Toggle speech recognition
  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    if (isListening) {
      isListeningRef.current = false;
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText("");
    } else {
      setSpokenText("");
      setInterimText("");
      setSpeechVerified(false);
      isListeningRef.current = true;
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.info("Listening... Speak now!");
      } catch (e) {
        console.error('Failed to start recognition:', e);
        toast.error("Failed to start speech recognition");
      }
    }
  };

  // Fuzzy string matching for speech verification
  const fuzzyMatch = (spoken: string, target: string): number => {
    const spokenWords = spoken.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const targetWords = target.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    if (targetWords.length === 0) return 1; // No target = always match

    let matchCount = 0;
    for (const targetWord of targetWords) {
      for (const spokenWord of spokenWords) {
        // Check if words are similar (allowing for minor differences)
        if (spokenWord.includes(targetWord) || targetWord.includes(spokenWord) ||
          levenshteinDistance(spokenWord, targetWord) <= 2) {
          matchCount++;
          break;
        }
      }
    }

    return matchCount / targetWords.length;
  };

  // Levenshtein distance for fuzzy matching
  const levenshteinDistance = (a: string, b: string): number => {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }

    return matrix[b.length][a.length];
  };

  // Check speech verification
  useEffect(() => {
    if (!isTaskActive || !selectedTask) return;

    const currentTaskSteps = getStepsForTask(selectedTask);
    const currentStep = currentTaskSteps[currentStepIndex];
    if (!currentStep?.speechPhrase) {
      setSpeechVerified(true); // No speech required
      return;
    }

    const matchScore = fuzzyMatch(spokenText, currentStep.speechPhrase);
    if (matchScore >= 0.7) { // 70% match threshold
      setSpeechVerified(true);
      if (isListening) {
        isListeningRef.current = false;
        recognitionRef.current?.stop();
        setIsListening(false);
        toast.success("✓ Speech Complete!");
      }
    }
  }, [spokenText, isTaskActive, selectedTask, currentStepIndex, isListening]);

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

  // Extract hand landmarks in normalized format (same as Training.tsx)
  const extractHandLandmarks = useCallback((hand: handPoseDetection.Hand | null): { landmarks: number[][] } | null => {
    if (!hand || !hand.keypoints || hand.keypoints.length < 21) return null;

    const wrist = hand.keypoints[0];
    const landmarks = hand.keypoints.map(kp => [
      (kp.x - wrist.x) / 100,  // Normalize relative to wrist
      (kp.y - wrist.y) / 100,
      (kp as any).z || 0
    ]);

    return { landmarks };
  }, []);

  // Classify gesture using DTW Server API (same format as Training.tsx)
  const classifyGestureDTW = useCallback(async (frames: any[]): Promise<{ gesture: string; confidence: number } | null> => {
    if (frames.length < MIN_FRAMES_FOR_DTW) return null;

    // Debug: Log what we're sending
    console.log('[DTW] Sending frames count:', frames.length);
    if (frames.length > 0) {
      console.log('[DTW] First frame:', JSON.stringify(frames[0]));
    }

    try {
      const response = await fetch('http://localhost:3000/api/gestures/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frames })  // Already in correct format: {timestamp, left_hand, right_hand}
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[DTW] Server response:', result);
        if (result.predicted_class && result.confidence !== undefined) {
          return { gesture: result.predicted_class, confidence: result.confidence };
        }
      } else {
        const errorText = await response.text();
        console.error('[DTW] Server error:', response.status, errorText);
      }
    } catch (err) {
      console.error('[DTW] Classification error:', err);
    }
    return null;
  }, []);

  // Test Gesture function - exactly like Training.tsx
  const startTestGesture = async () => {
    if (isTestingGesture || !detector) return;

    setIsTestingGesture(true);
    setTestGestureResult(null);
    testGestureFramesRef.current = [];

    const TEST_DURATION = 3000; // 3 seconds recording
    const FRAME_INTERVAL = 33;  // ~30fps

    try {
      // Phase 1: Countdown from 3
      for (let c = 3; c > 0; c--) {
        setTestGestureCountdown(c);
        await new Promise(r => setTimeout(r, 1000));
      }
      setTestGestureCountdown(0);

      // Phase 2: Wait for hand to appear (max 10 seconds)
      setTestMessage("Show your hand...");
      let waitTimeout = 0;
      while (lastHandsRef.current.length === 0) {
        await new Promise(r => setTimeout(r, 100));
        waitTimeout += 100;
        if (waitTimeout > 10000) throw new Error("Timeout waiting for hand");
        if (!videoRef.current) throw new Error("Camera stopped");
      }

      // Phase 3: Record for fixed duration
      setTestMessage("Recording your gesture...");
      testStartTimeRef.current = Date.now();

      while (Date.now() - testStartTimeRef.current < TEST_DURATION) {
        const elapsed = Date.now() - testStartTimeRef.current;
        const hands = lastHandsRef.current;

        // Extract landmarks in same format as Training.tsx
        let leftHand = null;
        let rightHand = null;

        if (hands.length > 0) {
          hands.forEach(hand => {
            const handData = extractHandLandmarks(hand);
            if (hand.handedness === 'Left') leftHand = handData;
            else rightHand = handData;
          });
        }

        // Record frame (same format as Training.tsx)
        testGestureFramesRef.current.push({
          timestamp: elapsed,
          left_hand: leftHand,
          right_hand: rightHand
        });

        // Update progress
        const progress = Math.round((elapsed / TEST_DURATION) * 100);
        setTestMessage(`Recording... ${progress}%`);

        await new Promise(r => setTimeout(r, FRAME_INTERVAL));
        if (!videoRef.current) throw new Error("Camera stopped");
      }

      const recordedFrameCount = testGestureFramesRef.current.length;
      console.log(`[Test] Recorded ${recordedFrameCount} frames`);
      console.log(`[Test] Sample frame:`, testGestureFramesRef.current[0]);

      if (recordedFrameCount < 10) {
        setTestGestureResult(`Too few frames (${recordedFrameCount}). Keep hand visible.`);
        toast.error("Not enough hand data. Keep your hand visible.");
        // Auto-dismiss after 3 seconds
        setTimeout(() => setTestGestureResult(null), 3000);
        return;
      }

      // Phase 4: Classify with DTW
      setTestMessage("Analyzing gesture with DTW...");
      console.log(`[Test] Calling classifyGestureDTW with ${recordedFrameCount} frames...`);

      const result = await classifyGestureDTW(testGestureFramesRef.current);
      console.log(`[Test] DTW result:`, result);

      if (result) {
        setTestGestureResult(`${result.gesture} (${(result.confidence * 100).toFixed(0)}%)`);
        setCurrentGesture(result.gesture);
        toast.success(`Detected: ${result.gesture} (${(result.confidence * 100).toFixed(0)}%)`);
      } else {
        setTestGestureResult("No gesture detected");
        toast.error("No gesture detected. Try again.");
      }

      // Auto-dismiss result after 3 seconds
      setTimeout(() => setTestGestureResult(null), 3000);

    } catch (err: any) {
      console.error('[Test] Error:', err);
      setTestGestureResult(`Error: ${err.message}`);
      toast.error(err.message);
      // Auto-dismiss error after 3 seconds
      setTimeout(() => setTestGestureResult(null), 3000);
    } finally {
      setIsTestingGesture(false);
      setTestGestureCountdown(null);
      setTestMessage(null);
      testGestureFramesRef.current = [];
    }
  };

  // Normalize gesture name for comparison (handles "GoodJob" vs "good_job" etc)
  const normalizeGestureName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[_\-\s]+/g, '') // Remove underscores, hyphens, spaces
      .trim();
  };

  // Helper to get steps
  const getStepsForTask = useCallback((task: Task): WIStep[] => {
    if (task.wiId) {
      const wi = workInstructions.find(w => w.id === task.wiId);
      return wi?.steps || [];
    }
    if (task.type === 'calibration') {
      return [
        { id: '1', gestureId: null, componentId: null, description: 'Verify camera position is correct and centered', speechPhrase: 'camera ready' },
        { id: '2', gestureId: null, componentId: null, description: 'Check lighting conditions - ensure no shadows', speechPhrase: 'lighting check complete' },
        { id: '3', gestureId: null, componentId: null, description: 'Perform T-Pose for 3 seconds to calibrate', speechPhrase: 'calibration done' },
      ];
    }
    return [];
  }, [workInstructions]);

  // Reset step verification states
  const resetStepVerification = useCallback(() => {
    setSpeechVerified(false);
    setGestureVerified(false);
    setComponentVerified(false);
    setLockedGesture(null);
    setLockedComponent(null);
    setSpokenText("");
    setInterimText("");
    setSpokenWords([]);
    setCurrentWordIndex(0);
    setIsVerifying(false);
    setVerificationStartTime(null);
    setCurrentGesture(null);
    gestureFramesRef.current = []; // Clear DTW frames
    isClassifyingGestureRef.current = false; // Reset classification lock
    setIsRecordingGesture(false);
    setGestureRecordingComplete(false);
  }, []);

  // Start countdown before step verification
  const startStepCountdown = useCallback(() => {
    setCountdown(3);
    setIsVerifying(false);

    // Prepare karaoke words from current step's speech phrase
    const currentStep = selectedTask ? getStepsForTask(selectedTask)[currentStepIndex] : null;
    if (currentStep?.speechPhrase) {
      const words = currentStep.speechPhrase.split(/\s+/).filter(w => w.length > 0);
      setKaraokeWords(words);
    } else {
      setKaraokeWords([]);
    }
    setCurrentWordIndex(0);
    setSpokenWords([]);
  }, [selectedTask, getStepsForTask, currentStepIndex]);

  const handleCompleteStep = useCallback(() => {
    if (!selectedTask) return;

    const wi = workInstructions.find(w => w.id === selectedTask.wiId);
    const totalSteps = wi?.steps?.length || selectedTask.totalSteps;

    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setStepVerified(false);
      // Reset and start countdown for next step
      resetStepVerification();
      toast.success(`Step ${currentStepIndex + 1} verified! ✓`);

      // Auto-start next step countdown after a brief pause
      setTimeout(() => {
        startStepCountdown();
      }, 1500);
    } else {
      setIsTaskActive(false);
      setIsVerifying(false);
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
      setTasks(prev => prev.map(t =>
        t.id === selectedTask.id
          ? { ...t, status: 'completed' as const, completedSteps: totalSteps }
          : t
      ));
      setSelectedTask(prev => prev ? { ...prev, status: 'completed', completedSteps: totalSteps } : null);
      toast.success("🎉 Task Completed Successfully!");
    }
  }, [selectedTask, workInstructions, currentStepIndex, resetStepVerification, startStepCountdown, isListening]);

  // Check if current step requirements are met and lock gesture/component on first high-confidence match
  const checkStepVerification = useCallback((gesture: string | null, gestureConfidence: number, components: Detection[]) => {
    if (!selectedTask || !isTaskActive || !isVerifying) return false;

    const currentTaskSteps = getStepsForTask(selectedTask);
    const currentStep = currentTaskSteps[currentStepIndex];
    if (!currentStep) return false;

    let gestureMatch = !currentStep.gestureId; // If no gesture required, it's a match
    let componentMatch = !currentStep.componentId; // If no component required, it's a match

    // Check gesture requirement - ONLY lock when CORRECT gesture detected with high confidence
    if (currentStep.gestureId) {
      if (lockedGesture) {
        // Already locked with correct gesture
        gestureMatch = true;
      } else if (gesture && gestureConfidence >= LOCK_CONFIDENCE) {
        // Check if this is the REQUIRED gesture (normalize names for flexible matching)
        const requiredGesture = trainedGestures.find(g => g.id === currentStep.gestureId);
        if (requiredGesture) {
          const detectedNorm = normalizeGestureName(gesture);
          const requiredNorm = normalizeGestureName(requiredGesture.name);

          console.log(`[Gesture Match] Detected: "${gesture}" (${detectedNorm}) vs Required: "${requiredGesture.name}" (${requiredNorm})`);

          if (detectedNorm === requiredNorm) {
            // CORRECT gesture detected - LOCK IT and mark as DONE
            setLockedGesture(gesture);
            setGestureVerified(true);
            gestureMatch = true;
            toast.success(`✓ Gesture "${gesture}" - Done!`);
          }
        } else {
          console.warn(`[Gesture Match] Required gesture ID ${currentStep.gestureId} not found in trained gestures`);
        }
      }
    }

    // Check component requirement - ONLY lock when CORRECT component detected
    if (currentStep.componentId) {
      if (lockedComponent) {
        // Already locked with correct component
        componentMatch = true;
      } else if (components.length > 0) {
        const requiredComponent = trainedComponents.find((_, i) => `${i + 1}` === currentStep.componentId);
        if (requiredComponent) {
          // Only lock if it's the REQUIRED component
          const found = components.find(c =>
            c.class.toLowerCase() === requiredComponent.toLowerCase() && c.confidence >= LOCK_CONFIDENCE
          );
          if (found) {
            setLockedComponent(found.class);
            setComponentVerified(true);
            componentMatch = true;
            toast.success(`✓ Component "${found.class}" - Done!`);
          }
        }
      }
    }

    // Update verification states
    if (gestureMatch && currentStep.gestureId) setGestureVerified(true);
    if (componentMatch && currentStep.componentId) setComponentVerified(true);

    // Check speech separately (handled in useEffect)
    const speechMatch = !currentStep.speechPhrase || speechVerified;

    // FORCE COMPLETE if all conditions met
    if (gestureMatch && componentMatch && speechMatch) {
      console.log('[checkStepVerification] All conditions met, completing step...');
      handleCompleteStep();
    }

    return gestureMatch && componentMatch && speechMatch;
  }, [selectedTask, isTaskActive, isVerifying, currentStepIndex, trainedGestures, trainedComponents, speechVerified, lockedGesture, lockedComponent, getStepsForTask, handleCompleteStep]);

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
        const shouldProcessFrame = frameCountRef.current % HAND_FRAME_SKIP === 0;

        // Hand Detection - ALWAYS detect hands (like Training.tsx)
        let hands: handPoseDetection.Hand[] = [];

        if (shouldProcessFrame) {
          hands = await detector.estimateHands(video);
          setHandsDetected(hands.length);
          lastHandsRef.current = hands; // ALWAYS store for test function
        }

        let detectedGesture: string | null = lockedGesture; // Use locked gesture if available
        let gestureConfidence = lockedGesture ? 1.0 : 0; // Locked = 100% confidence
        const now = Date.now();

        // Process each detected hand - draw ALL keypoints like Training.tsx
        for (const hand of hands) {
          // Draw ALL 21 keypoints (same as Training.tsx)
          hand.keypoints.forEach(kp => {
            ctx.beginPath();
            ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = isTestingGesture ? '#ff0000' : (lockedGesture ? '#00ff00' : '#00FF00');
            ctx.fill();
          });
        }

        // Collect frames for DTW verification - during gesture recording phase only
        if (!lockedGesture && isVerifying && isRecordingGesture && !gestureRecordingComplete && hands.length > 0) {
          const elapsed = Date.now() - gestureStartTimeRef.current;

          // Extract landmarks in same format as Training.tsx
          let leftHand = null;
          let rightHand = null;

          hands.forEach(hand => {
            const handData = extractHandLandmarks(hand);
            if (hand.handedness === 'Left') leftHand = handData;
            else rightHand = handData;
          });

          // Record frame (same format as Training.tsx)
          gestureFramesRef.current.push({
            timestamp: elapsed,
            left_hand: leftHand,
            right_hand: rightHand
          });

          // After GESTURE_RECORD_DURATION, classify ONCE (use ref flag to prevent multiple calls)
          if (elapsed >= GESTURE_RECORD_DURATION && gestureFramesRef.current.length >= MIN_FRAMES_FOR_DTW && !isClassifyingGestureRef.current) {
            isClassifyingGestureRef.current = true; // LOCK - prevent multiple API calls
            console.log(`[Verify] Recording complete! ${gestureFramesRef.current.length} frames in ${elapsed}ms`);
            setIsRecordingGesture(false);

            // Classify with all collected frames (copy array to avoid mutations)
            const framesToClassify = [...gestureFramesRef.current];
            gestureFramesRef.current = []; // Clear immediately

            classifyGestureDTW(framesToClassify).then(result => {
              console.log('[Verify] DTW result:', result);
              setGestureRecordingComplete(true);

              if (result && result.confidence > LOCK_CONFIDENCE) {
                setCurrentGesture(result.gesture);
                console.log(`[Verify] Detected: ${result.gesture} (${(result.confidence * 100).toFixed(0)}%)`);

                // Check step verification with DTW result
                if (isVerifying && !lockedGesture) {
                  checkStepVerification(result.gesture, result.confidence, currentComponents);
                }

                toast.success(`🖐️ Gesture: ${result.gesture} (${(result.confidence * 100).toFixed(0)}%)`);
              } else {
                console.log(`[Verify] Low confidence or no result`);
                setCurrentGesture(result?.gesture || 'unknown');
                toast.warning(`⚠️ Gesture unclear: ${result?.gesture || 'none'} (${((result?.confidence || 0) * 100).toFixed(0)}%)`);
              }

              toast.info("🎤 Now speak the phrase!");
            }).catch(err => {
              console.error('[Verify] DTW classification failed:', err);
              setGestureRecordingComplete(true);
              toast.error("Gesture classification failed");
            });
          }
        }

        // Update current gesture display (may be overwritten by DTW async result)
        if (!lockedGesture) {
          // Keep showing locked gesture or last DTW result
        }

        // Component Detection (throttled + ROI optimization) - SKIP if component already locked
        const shouldDetectComponent = !lockedComponent && isVerifying;

        if (!lockedComponent && !isDetecting && now - lastDetectionTime.current > detectionIntervalRef.current) {
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

                  // Adaptive detection frequency
                  // Check if any detection has >70% confidence
                  const hasHighConfidence = adjustedDetections.some(
                    (det: Detection) => det.confidence >= 0.70
                  );

                  if (hasHighConfidence) {
                    // Object found - slow down detection
                    detectionIntervalRef.current = SLOW_DETECTION_INTERVAL;
                    console.log('[Adaptive] Object found (>70%), slowing to 2000ms');
                  } else {
                    // No confident detection - speed up to search
                    detectionIntervalRef.current = FAST_DETECTION_INTERVAL;
                    console.log('[Adaptive] Searching for objects, fast mode 500ms');
                  }
                } else {
                  // No detections at all - fast search mode
                  setCurrentComponents([]);
                  detectionIntervalRef.current = FAST_DETECTION_INTERVAL;
                }
                if (result.error) {
                  console.warn('YOLO Error:', result.error);
                }
              }
            } catch (err) {
              console.error('Detection API error:', err);
              // On error, use fast interval to retry
              detectionIntervalRef.current = FAST_DETECTION_INTERVAL;
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

        // Auto-verification logic - check step requirements
        if (isTaskActive && selectedTask && isVerifying) {
          checkStepVerification(detectedGesture, gestureConfidence, currentComponents);
        }
      }

      animationFrameId = requestAnimationFrame(detect);
    };

    detect();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isLive, detector, currentComponents, isTaskActive, selectedTask, currentStepIndex, extractFeatures, classifyGesture, checkStepVerification, isDetecting, isVerifying, lockedGesture, lockedComponent, isRecordingGesture, gestureRecordingComplete]);

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

  // Camera Setup - Only start after permission granted
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      // Wait for permissions to be checked and camera permission granted
      if (isLive && id === "emp-001" && cameraPermission === 'granted') {
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
  }, [isLive, id, cameraPermission]);

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    setCurrentStepIndex(0);
    setIsTaskActive(false);
    setStepVerified(false);
    setIsVerifying(false);
    setCountdown(null);
    // Reset all verification states
    setSpeechVerified(false);
    setGestureVerified(false);
    setComponentVerified(false);
    setSpokenText("");
    setSpokenWords([]);
    setKaraokeWords([]);
    setCurrentWordIndex(0);
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleStartTask = () => {
    if (!selectedTask) return;
    setIsTaskActive(true);
    setCurrentStepIndex(0);
    setStepVerified(false);
    // Reset all verification states for first step
    resetStepVerification();
    // Start countdown for first step
    startStepCountdown();
  };





  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Countdown finished - start verification with gesture recording phase
      setCountdown(null);
      setIsVerifying(true);
      setIsRecordingGesture(true); // Start gesture recording phase
      setGestureRecordingComplete(false);
      setVerificationStartTime(Date.now());
      gestureFramesRef.current = []; // Clear any old frames
      gestureStartTimeRef.current = Date.now();
      isClassifyingGestureRef.current = false; // Reset classification lock

      // Start speech recognition automatically
      if (recognitionRef.current) {
        setSpokenText("");
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (e) {
          console.error("Failed to start speech recognition:", e);
        }
      }

      toast.info("🖐️ GESTURE FIRST! Hold your gesture for 2 seconds...");
    }
  }, [countdown]);

  // Verification timeout - check if all requirements met
  useEffect(() => {
    if (!isVerifying || !verificationStartTime) return;

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - verificationStartTime;

      // Check if all verifications passed (gesture/component are locked once detected)
      const currentStep = selectedTask ? getStepsForTask(selectedTask)[currentStepIndex] : null;

      // Gesture verified = locked or not required
      const gestureOk = !currentStep?.gestureId || lockedGesture !== null;
      // Component verified = locked or not required  
      const componentOk = !currentStep?.componentId || lockedComponent !== null;
      // Speech verified = matched or not required
      const speechOk = !currentStep?.speechPhrase || speechVerified;

      const allVerified = gestureOk && componentOk && speechOk;

      if (allVerified) {
        // Success! Move to next step
        setIsVerifying(false);
        setIsRecordingGesture(false);
        setGestureRecordingComplete(false);
        isListeningRef.current = false;
        setIsListening(false);
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }

        // Show final summary
        toast.success("✅ STEP PASSED!", { duration: 2000 });
        console.log('[Verify] PASSED - Gesture:', lockedGesture, 'Component:', lockedComponent, 'Speech:', speechVerified);

        handleCompleteStep();
      } else if (elapsed >= VERIFICATION_DURATION) {
        // Time's up - show final summary
        setIsVerifying(false);
        setIsRecordingGesture(false);
        setGestureRecordingComplete(false);
        isListeningRef.current = false;
        setIsListening(false);
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }

        // Build summary of what passed/failed
        const results = [];
        if (currentStep?.gestureId) {
          results.push(lockedGesture ? `✅ Gesture: ${lockedGesture}` : `❌ Gesture: FAILED`);
        }
        if (currentStep?.componentId) {
          results.push(lockedComponent ? `✅ Component: ${lockedComponent}` : `❌ Component: FAILED`);
        }
        if (currentStep?.speechPhrase) {
          results.push(speechVerified ? `✅ Speech: OK` : `❌ Speech: FAILED`);
        }

        console.log('[Verify] FAILED - Summary:', results.join(', '));
        toast.error(`❌ STEP FAILED!\n${results.join('\n')}`, { duration: 4000 });

        resetStepVerification();
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, [isVerifying, verificationStartTime, speechVerified, selectedTask, currentStepIndex, lockedGesture, lockedComponent]);





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
              {/* Permission Status */}
              {id === "emp-001" && (
                <>
                  <Badge
                    variant="outline"
                    className={`text-xs ${cameraPermission === 'granted' ? 'border-green-500 text-green-500' : cameraPermission === 'denied' ? 'border-red-500 text-red-500' : 'border-yellow-500 text-yellow-500'}`}
                  >
                    <Video className="w-3 h-3 mr-1" />
                    {cameraPermission === 'granted' ? '✓' : cameraPermission === 'denied' ? '✗' : '?'}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${micPermission === 'granted' ? 'border-green-500 text-green-500' : micPermission === 'denied' ? 'border-red-500 text-red-500' : 'border-yellow-500 text-yellow-500'}`}
                  >
                    <Mic className="w-3 h-3 mr-1" />
                    {micPermission === 'granted' ? '✓' : micPermission === 'denied' ? '✗' : '?'}
                  </Badge>
                </>
              )}
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

                  {/* Permission Request Overlay */}
                  {id === "emp-001" && !permissionsChecked && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30">
                      <div className="text-white text-center p-6">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">Requesting Permissions</h3>
                        <p className="text-white/70 mb-4">Please allow access to camera and microphone</p>
                        <div className="flex justify-center gap-4">
                          <div className={`flex items-center gap-2 ${cameraPermission === 'granted' ? 'text-green-400' : 'text-yellow-400'}`}>
                            <Video className="w-5 h-5" />
                            <span>Camera {cameraPermission === 'granted' ? '✓' : '...'}</span>
                          </div>
                          <div className={`flex items-center gap-2 ${micPermission === 'granted' ? 'text-green-400' : 'text-yellow-400'}`}>
                            <Mic className="w-5 h-5" />
                            <span>Microphone {micPermission === 'granted' ? '✓' : '...'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Permission Denied Warning */}
                  {id === "emp-001" && permissionsChecked && (cameraPermission === 'denied' || micPermission === 'denied') && (
                    <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center z-30">
                      <div className="text-white text-center p-6">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                        <h3 className="text-xl font-bold mb-2">Permissions Required</h3>
                        <p className="text-white/70 mb-4">
                          {cameraPermission === 'denied' && micPermission === 'denied'
                            ? 'Camera and microphone access denied'
                            : cameraPermission === 'denied'
                              ? 'Camera access denied'
                              : 'Microphone access denied'}
                        </p>
                        <p className="text-sm text-white/50">
                          Please enable permissions in your browser settings and refresh the page
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Model Loading Indicator */}
                  {isLoadingModel && permissionsChecked && cameraPermission === 'granted' && (
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
                      variant={isTestingGesture ? "destructive" : "secondary"}
                      onClick={startTestGesture}
                      disabled={isTestingGesture || isVerifying}
                      className={isTestingGesture ? "animate-pulse" : ""}
                    >
                      <Hand className="w-4 h-4" />
                      <span className="ml-1 text-xs">{isTestingGesture ? "Testing..." : "Test Gesture"}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant={isListening ? "destructive" : "secondary"}
                      onClick={toggleListening}
                      className={isListening ? "animate-pulse" : ""}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      <span className="ml-1 text-xs">{isListening ? "Stop" : "Test Speech"}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setIsLive(!isLive)}
                    >
                      {isLive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    </Button>
                  </div>

                  {/* Test Speech Display - Shows what website hears */}
                  {isListening && !isVerifying && (
                    <div className="absolute bottom-4 left-4 right-4 z-10">
                      <div className="bg-black/90 rounded-xl px-5 py-4 border border-red-500/30">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-red-400 text-sm font-medium">LISTENING</span>
                          <span className="text-white/40 text-xs ml-auto">Speak into your microphone</span>
                        </div>
                        {/* Show interim (real-time) text in yellow */}
                        {interimText && (
                          <p className="text-yellow-400 text-xl mb-1 animate-pulse">
                            {interimText}
                          </p>
                        )}
                        {/* Show final (confirmed) text in white */}
                        <p className="text-white/70 text-lg min-h-[28px]">
                          {spokenText || (interimText ? "" : "Say something...")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Countdown Overlay */}
                  {countdown !== null && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-9xl font-bold text-white animate-pulse">
                          {countdown}
                        </div>
                        <p className="text-2xl text-white/80 mt-4">Get Ready!</p>
                        <p className="text-lg text-white/60 mt-2">
                          Prepare to perform gesture and speak the phrase
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Test Gesture Countdown Overlay */}
                  {testGestureCountdown !== null && testGestureCountdown > 0 && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="text-9xl font-bold text-yellow-400 animate-pulse">
                          {testGestureCountdown}
                        </div>
                        <p className="text-2xl text-white/80 mt-4">Test Gesture Starting...</p>
                        <p className="text-lg text-white/60 mt-2">
                          Get your hand in position
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Test Gesture Recording Overlay */}
                  {isTestingGesture && testGestureCountdown === 0 && testMessage && (
                    <div className="absolute bottom-4 left-4 right-4 z-20">
                      <div className="bg-red-900/90 rounded-xl px-5 py-4 border border-red-500">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-white font-medium">{testMessage}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Test Gesture Result */}
                  {testGestureResult && !isTestingGesture && (
                    <div className="absolute bottom-4 left-4 right-4 z-20">
                      <div className={`rounded-xl px-5 py-4 border ${testGestureResult.includes('(') && !testGestureResult.includes('Error')
                          ? 'bg-green-900/90 border-green-500'
                          : 'bg-red-900/90 border-red-500'
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">{testGestureResult}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-white hover:bg-white/10"
                            onClick={() => setTestGestureResult(null)}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Verification Timer + Karaoke Overlay */}
                  {isVerifying && isTaskActive && selectedTask && (
                    <div className="absolute inset-0 pointer-events-none z-10">
                      {/* Timer bar at top */}
                      <div className="absolute top-0 left-0 right-0 h-2 bg-black/50">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all duration-100"
                          style={{
                            width: `${Math.max(0, 100 - ((Date.now() - (verificationStartTime || 0)) / VERIFICATION_DURATION) * 100)}%`
                          }}
                        />
                      </div>

                      {/* Gesture Recording Phase Indicator */}
                      {isRecordingGesture && !gestureRecordingComplete && (
                        <div className="absolute top-4 left-4 right-4 flex justify-center">
                          <div className="bg-red-600/90 rounded-xl px-6 py-3 border-2 border-red-400 animate-pulse">
                            <div className="flex items-center gap-3 text-white">
                              <div className="w-3 h-3 bg-white rounded-full animate-ping" />
                              <Hand className="w-6 h-6" />
                              <span className="text-lg font-bold">RECORDING GESTURE...</span>
                              <span className="text-sm opacity-80">
                                {Math.max(0, Math.ceil((GESTURE_RECORD_DURATION - (Date.now() - gestureStartTimeRef.current)) / 1000))}s
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Gesture Complete - Now Speech */}
                      {gestureRecordingComplete && (
                        <div className="absolute top-4 left-4 right-4 flex justify-center">
                          <div className={`rounded-xl px-6 py-3 border-2 ${lockedGesture ? 'bg-green-600/90 border-green-400' : 'bg-yellow-600/90 border-yellow-400'
                            }`}>
                            <div className="flex items-center gap-3 text-white">
                              {lockedGesture ? (
                                <>
                                  <CheckCircle2 className="w-6 h-6" />
                                  <span className="text-lg font-bold">✓ Gesture: {lockedGesture}</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-6 h-6" />
                                  <span className="text-lg font-bold">⚠ Gesture: {currentGesture || 'unclear'}</span>
                                </>
                              )}
                              <span className="text-sm opacity-80 ml-4">🎤 Now speak!</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Karaoke words display */}
                      {karaokeWords.length > 0 && (
                        <div className="absolute bottom-20 left-0 right-0 flex justify-center">
                          <div className="bg-black/80 rounded-2xl px-6 py-4 mx-4">
                            <div className="flex flex-wrap justify-center gap-2 text-2xl font-bold">
                              {karaokeWords.map((word, idx) => (
                                <span
                                  key={idx}
                                  className={`transition-all duration-300 ${idx < currentWordIndex
                                      ? 'text-green-400 scale-95'
                                      : idx === currentWordIndex
                                        ? 'text-yellow-400 scale-110 animate-pulse'
                                        : 'text-white/50'
                                    }`}
                                >
                                  {word}
                                </span>
                              ))}
                            </div>
                            {/* Spoken feedback */}
                            <div className="text-center mt-3 text-sm text-white/60">
                              <Mic className="w-4 h-4 inline mr-1 animate-pulse text-red-500" />
                              {spokenText || interimText || "Listening..."}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Verification status badges - show LOCKED status */}
                      <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-3">
                        {currentTaskSteps[currentStepIndex]?.gestureId && (
                          <Badge className={`text-sm px-3 py-1 ${lockedGesture ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}>
                            <Hand className="w-4 h-4 mr-1" />
                            {lockedGesture ? `✓ ${lockedGesture}` : 'Show Gesture'}
                          </Badge>
                        )}
                        {currentTaskSteps[currentStepIndex]?.componentId && (
                          <Badge className={`text-sm px-3 py-1 ${lockedComponent ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}>
                            <Box className="w-4 h-4 mr-1" />
                            {lockedComponent ? `✓ ${lockedComponent}` : 'Show Component'}
                          </Badge>
                        )}
                        {currentTaskSteps[currentStepIndex]?.speechPhrase && (
                          <Badge className={`text-sm px-3 py-1 ${speechVerified ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`}>
                            <Volume2 className="w-4 h-4 mr-1" />
                            {speechVerified ? '✓ Speech' : 'Say Phrase'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Task Overlay (when not verifying) */}
                  {isTaskActive && selectedTask && !isVerifying && countdown === null && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <div className="text-white">
                        <p className="text-sm opacity-70">Step {currentStepIndex + 1} of {currentTaskSteps.length}</p>
                        <p className="text-lg font-medium">{currentTaskSteps[currentStepIndex]?.description}</p>
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={startStepCountdown}
                        >
                          <PlayCircle className="w-4 h-4 mr-1" />
                          Start Step Verification
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Task Requirements Panel - Below Webcam */}
            {isTaskActive && selectedTask && currentTaskSteps[currentStepIndex] && (
              <Card className={`border-2 transition-all ${isVerifying
                  ? 'border-yellow-500/50 bg-yellow-500/5'
                  : 'border-primary/20 bg-gradient-to-r from-primary/5 to-transparent'
                }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      {isVerifying ? (
                        <>
                          <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                          Verifying Step {currentStepIndex + 1}...
                        </>
                      ) : countdown !== null ? (
                        <>
                          <Clock className="w-4 h-4 text-primary" />
                          Get Ready - {countdown}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          Step {currentStepIndex + 1} Requirements
                        </>
                      )}
                    </h3>
                    <div className="flex items-center gap-2">
                      {!isVerifying && countdown === null && (
                        <Button size="sm" variant="default" onClick={startStepCountdown}>
                          <PlayCircle className="w-4 h-4 mr-1" />
                          Start
                        </Button>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {[lockedGesture, lockedComponent, speechVerified].filter(Boolean).length}/
                        {[currentTaskSteps[currentStepIndex]?.gestureId,
                        currentTaskSteps[currentStepIndex]?.componentId,
                        currentTaskSteps[currentStepIndex]?.speechPhrase].filter(Boolean).length || 1} Verified
                      </Badge>
                    </div>
                  </div>

                  {/* Step Description */}
                  <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm font-medium">{currentTaskSteps[currentStepIndex]?.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {/* Gesture Requirement - shows LOCKED status */}
                    <div className={`p-3 rounded-lg border-2 transition-all ${!currentTaskSteps[currentStepIndex]?.gestureId
                        ? 'border-muted bg-muted/20 opacity-50'
                        : lockedGesture
                          ? 'border-green-500 bg-green-500/10'
                          : isVerifying
                            ? 'border-orange-500 bg-orange-500/10 animate-pulse'
                            : 'border-orange-500/50 bg-orange-500/5'
                      }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Hand className={`w-5 h-5 ${lockedGesture ? 'text-green-500' : 'text-orange-500'}`} />
                        <span className="font-medium text-sm">Gesture</span>
                        {lockedGesture && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
                      </div>
                      <p className="text-sm font-medium">
                        {lockedGesture
                          ? `✓ ${lockedGesture}`
                          : currentTaskSteps[currentStepIndex]?.gestureId
                            ? trainedGestures.find(g => g.id === currentTaskSteps[currentStepIndex]?.gestureId)?.name || currentTaskSteps[currentStepIndex]?.gestureId
                            : 'None required'}
                      </p>
                    </div>

                    {/* Component Requirement - shows LOCKED status */}
                    <div className={`p-3 rounded-lg border-2 transition-all ${!currentTaskSteps[currentStepIndex]?.componentId
                        ? 'border-muted bg-muted/20 opacity-50'
                        : lockedComponent
                          ? 'border-green-500 bg-green-500/10'
                          : isVerifying
                            ? 'border-orange-500 bg-orange-500/10 animate-pulse'
                            : 'border-orange-500/50 bg-orange-500/5'
                      }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Box className={`w-5 h-5 ${lockedComponent ? 'text-green-500' : 'text-orange-500'}`} />
                        <span className="font-medium text-sm">Component</span>
                        {lockedComponent && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
                      </div>
                      <p className="text-sm font-medium">
                        {lockedComponent
                          ? `✓ ${lockedComponent}`
                          : currentTaskSteps[currentStepIndex]?.componentId
                            ? trainedComponents[parseInt(currentTaskSteps[currentStepIndex]?.componentId || '0') - 1] || 'Component'
                            : 'None required'}
                      </p>
                    </div>

                    {/* Speech Requirement with Karaoke Preview */}
                    <div className={`p-3 rounded-lg border-2 transition-all ${!currentTaskSteps[currentStepIndex]?.speechPhrase
                        ? 'border-muted bg-muted/20 opacity-50'
                        : speechVerified
                          ? 'border-green-500 bg-green-500/10'
                          : isVerifying
                            ? 'border-blue-500 bg-blue-500/10 animate-pulse'
                            : 'border-blue-500/50 bg-blue-500/5'
                      }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Volume2 className={`w-5 h-5 ${speechVerified ? 'text-green-500' : 'text-blue-500'}`} />
                        <span className="font-medium text-sm">Speech</span>
                        {speechVerified && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
                        {isVerifying && isListening && !speechVerified && (
                          <Mic className="w-4 h-4 text-red-500 ml-auto animate-pulse" />
                        )}
                      </div>
                      <p className="text-sm font-medium">
                        {currentTaskSteps[currentStepIndex]?.speechPhrase
                          ? `"${currentTaskSteps[currentStepIndex]?.speechPhrase}"`
                          : 'None required'}
                      </p>
                      {isVerifying && spokenText && (
                        <p className="text-xs text-muted-foreground mt-1 italic truncate">
                          Heard: "{spokenText}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Verification Timer Progress */}
                  {isVerifying && verificationStartTime && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Time Remaining</span>
                        <span>{Math.max(0, Math.ceil((VERIFICATION_DURATION - (Date.now() - verificationStartTime)) / 1000))}s</span>
                      </div>
                      <Progress
                        value={Math.max(0, 100 - ((Date.now() - verificationStartTime) / VERIFICATION_DURATION) * 100)}
                        className="h-2"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${isTaskActive && index === currentStepIndex
                                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                  : index < currentStepIndex || selectedTask.status === 'completed'
                                    ? 'border-green-500/30 bg-green-500/5'
                                    : 'border-border'
                                }`}
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${index < currentStepIndex || selectedTask.status === 'completed'
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
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedTask?.id === task.id
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
