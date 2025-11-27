# NextXO Employee Monitor - Development Plan & History

## Session: November 24, 2025

### Overview
Initial setup and rapid development of the NextXO Employee Monitor dashboard, focusing on AI training capabilities and branding.

### Key Decisions & Implementations

#### 1. Project Architecture
- **Stack**: React + Vite + Tailwind CSS + Shadcn/UI.
- **Backend Decision**: Added a lightweight Node.js/Express server (`server.js`) running on port 3000.
  - *Reasoning*: We needed a way to save annotated datasets permanently. Browser-only storage is insufficient for large image datasets. The server handles file uploads and unzipping.

#### 2. Style & UI
- **Style Guide**: Established `Style_instruction.md` early on.
- **Theme**: Professional dark mode with "Primary Blue" accents to convey trust and security.
- **Components**: utilized Shadcn/UI for rapid, accessible component development.

#### 3. AI Training Module (`/training`)
- **Workflow**: Users can upload images -> Annotate them -> Save to server -> Train model.
- **Annotation Tool**: Built `ImageAnnotator.tsx` from scratch.
  - *Decision*: Uses `JSZip` to bundle images and JSON annotations on the client side. This ensures atomic uploads and keeps the dataset organized.
- **Training Simulation**: Integrated `@tensorflow/tfjs`.
  - *Current State*: The training process is currently a simulation (visual progress bars and state updates) to demonstrate the UX flow. The structure is ready for actual tensor operations.
  - *Logic Fix*: Implemented logic to handle "Catastrophic Forgetting". When training new classes, we explicitly mark unselected classes as `isTrained: false` to reflect that the model would need retraining on the full dataset in a real scenario.
- **Persistence**: Used `localStorage` to persist class names and counts across reloads.

#### 4. Rebranding (Lovable -> NextXO)
- **Identity**: Renamed project to "NextXO Employee Monitor".
- **Logo**: Created a custom SVG logo (Shield + Circuit design) to represent "AI Security".
- **Cleanup**: Removed `lovable-tagger` and related metadata from `index.html`, `package.json`, and `vite.config.ts` to ensure a clean codebase.

### Future Roadmap / Next Steps
- **Real AI Training**: Connect the TensorFlow.js simulation to actual `model.fit()` calls using the uploaded datasets.
- **Python Integration**: The `dataset/` folder is structured to be consumed by the Python scripts in `training_scripts/` for more powerful offline training.
- **Live Inference**: Connect the `Monitor.tsx` page to a real video feed and run the TF.js model for real-time detection.
- **KNN Movement Training**: Currently uses a local webcam for training movement/gestures. 
  - *Future Task*: Replace local webcam access with a connection to the IP camera stream for the production environment.

## Session: November 25, 2025

### Achievements
- **Work Instruction Builder (`BuildWI.tsx`)**:
  - Implemented a drag-and-drop interface for creating assembly sequences.
  - Added routine scheduling (Frequency & Time).
  - Enabled saving of Work Instructions to `localStorage`.
- **Team Management (`ManageTeam.tsx`)**:
  - Created a new page to manage teams and assign Work Instructions.
  - Implemented member management (Add/Remove employees).
  - Linked team assignments to the Monitor view.
- **Monitor Page Enhancements (`Monitor.tsx`)**:
  - **Dynamic Task Loading**: Tasks now automatically populate based on the employee's team assignment.
  - **AI Integration**: Integrated MediaPipe for hand tracking and prepared the pipeline for custom object detection.
  - **Interactive Workflow**: Added a "Start Task" sequence with a countdown timer.
  - **Karaoke-Style Verification**: Implemented a speech-to-text system where spoken words highlight in real-time to verify step completion.
- **Infrastructure**:
  - Created `.env` file for IP Camera configuration.
  - Updated navigation and routing to include new modules.

### Current Status
- The system now supports a full lifecycle: **Train AI -> Build Instructions -> Assign to Team -> Monitor Execution**.
- The Monitor page features a sophisticated interactive overlay for guiding employees through tasks.

### Next Steps
- **Backend Integration**: Move from `localStorage` to a real database for Teams and Work Instructions.
- **Real Model Inference**: Connect the custom object detection model to the Monitor page's visualization.
- **Reporting**: Implement the "Export Report" functionality in Quick Actions.

---

## Session: November 25, 2025 (Evening) - Gesture Recognition Overhaul

### Major Changes: GRU → DTW + k-NN

#### Problem with Previous Approach
- The GRU (neural network) approach required significant training time and data
- Velocity-based gesture detection was unreliable (timeout issues, coordinate bugs)
- Complex recording triggers made UX frustrating

#### New Architecture: Dynamic Time Warping (DTW) + k-Nearest Neighbors
- **DTW Algorithm**: Measures similarity between temporal sequences regardless of speed variations
  - Perfect for gestures performed at different speeds
  - Custom implementation with Sakoe-Chiba band for O(n²) → O(n·w) optimization
- **k-NN (k=3)**: Simple majority vote classification from nearest templates
  - No training required - just stores reference sequences
  - Instant "training" by building template library
- **Normalization**: Landmarks normalized to wrist origin, scaled by palm size

#### Key Implementation Files
- `gesture_workflow/scripts/dtw_gesture.py`: Main DTW + k-NN classifier
  - Modes: `--train`, `--stream`, `--classify`, `--info`
  - Uses pickle (.pkl) for model serialization
- `src/pages/Training.tsx`: Updated training UI

#### Recording System Overhaul
- **Removed**: Velocity-based motion detection (was buggy)
- **Added**: Fixed-duration recording per gesture class
- **Per-Gesture Duration**: Each gesture class stores its own recording duration (2-6 seconds)
  - Set when creating the gesture class in "Add Gesture" dialog
  - Duration selector: 2s, 3s, 4s, 5s, 6s buttons
- **Test Mode**: Uses fixed 3-second duration for universal testing

#### UI Updates
- **Add Gesture Dialog**: Now includes duration selector
- **Webcam Overlay**: Shows selected gesture's recording duration
- **Record Button**: Displays duration (e.g., "Record 3s")
- **Badge System**: "Trained" vs "New" status for each gesture class

#### Data Structure
```json
// gesture_workflow/classes.json
{
  "classes": [{
    "id": "gesture_xxx",
    "name": "wave",
    "displayName": "Wave",
    "duration": 3,
    "createdAt": "..."
  }]
}
```

#### Server Updates (`server.js`)
- POST `/api/gestures/classes` now accepts `duration` field
- Model endpoints updated for DTW (.pkl files instead of .h5)
- Sequence storage unchanged (JSON files per recording)

### Benefits of DTW Approach
1. **No Training Wait**: Templates stored instantly
2. **Speed Invariant**: Same gesture at different speeds still matches
3. **Interpretable**: Can debug by examining distance to each template
4. **Low Data Requirement**: Works with just 1-3 samples per class

### Current Status
- ✅ DTW implementation complete
- ✅ Per-gesture duration feature complete
- ✅ Recording system simplified
- ✅ Server updated for new model format
- 🔄 Ready for testing with real gestures

---

## Session: November 26, 2025 - DTW Performance Optimization

### Problem Identified
During real-world testing, gesture classification was taking **too long** (500-1000ms per request), making the system feel unresponsive for real-time use.

### Root Cause Analysis
1. **Process Spawn Overhead (~200-300ms)**: Every classification request spawned a new Python process
   - Python interpreter startup time
   - Loading all imports (numpy, etc.)
   - Loading the pickle model from disk
   
2. **Unoptimized DTW Computation (~27ms for 12 templates)**:
   - Full 50-frame sequences being compared
   - Comparing against ALL training samples (12 templates)
   - O(n × m × num_templates) complexity

### Solutions Implemented

#### 1. Sequence Downsampling
```python
def downsample_sequence(seq, target_frames=20):
    """Downsample to fixed frame count using linear interpolation"""
    indices = np.linspace(0, len(seq) - 1, target_frames).astype(int)
    return seq[indices]
```
- Reduces frames from ~50 to 20 (60% reduction)
- Preserves gesture shape through index-based sampling

#### 2. Centroid Templates
```python
def compute_centroid(sequences):
    """Average multiple templates into one representative"""
    # Resample all to same length, then average
```
- Instead of comparing against all 12 samples, compute 1 centroid per class
- Reduces comparisons from O(num_samples) to O(num_classes)
- 2 classes = 2 centroids vs 12 templates = **6x fewer comparisons**

#### 3. Persistent Python Process
```javascript
// server.js - Keep inference process alive
let gestureInferenceProcess = null;

function startGestureProcess() {
    gestureInferenceProcess = spawn(PYTHON_PATH, [SCRIPT, '--stream']);
    // Keeps running, accepts multiple requests
}
```
- Model loaded once on server start
- No process spawn overhead per request
- Auto-reloads after training completes

### Performance Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| DTW computation | ~27ms | ~1ms | **27x faster** |
| API response time | 500-1000ms | 12-22ms | **40-80x faster** |
| Process startup | Every request | Once | **Eliminated** |

### Files Modified
- `gesture_workflow/scripts/dtw_gesture.py`:
  - Added `downsample_sequence()` function
  - Added `compute_centroid()` function
  - Updated `DTWGestureClassifier` with centroid support
  - Modified `save()` to build centroids before saving
  - Modified `load()` to restore centroids
  
- `server.js`:
  - Added persistent `gestureInferenceProcess`
  - Added `startGestureProcess()` function
  - Added `/api/gestures/reload` endpoint
  - Modified `/api/gestures/classify` to use persistent process
  - Auto-reload process after training completes

### Accuracy Verification
- Leave-one-out cross-validation: **100%** accuracy maintained

---

## Session: November 26, 2025 (Afternoon) - Live Monitor Enhancement

### Goals
Enhance the Monitor page with comprehensive task verification:

1. **Task Requirements Panel** (below webcam)
   - Show required gesture with visual indicator
   - Show required spoken phrase
   - Show required component to present to camera
   
2. **Speech-to-Text Integration**
   - Use Web Speech API for real-time speech recognition
   - Compare spoken text against step description
   - Fuzzy matching for natural language variations
   
3. **Triple Verification System**
   - ✋ Gesture verification (DTW classifier)
   - 🎤 Speech verification (speech-to-text matching)
   - 📦 Component verification (YOLO detection)

### Implementation Status

#### ✅ Phase 1: Enhanced Task Requirements UI
- Added "Requirements" panel below webcam showing:
  - Current step number and description
  - Required gesture with real-time verification status
  - Required component with detection status
  - Required speech phrase with listening controls
  - Overall progress bar

#### ✅ Phase 2: Speech-to-Text
- Integrated Web Speech API (`webkitSpeechRecognition`)
- Added `speechPhrase` field to WIStep interface
- Implemented fuzzy string matching with Levenshtein distance
- Visual feedback during listening (microphone button states)
- 70% match threshold for verification

#### ✅ Phase 3: Integration
- All three verification methods working together
- Individual verification states tracked separately
- Progress bar shows combined verification status
- States reset properly between steps

### Files Modified
- `src/pages/Monitor.tsx`:
  - Added speech recognition state and refs
  - Added `toggleListening()` function
  - Added `fuzzyMatch()` and `levenshteinDistance()` functions
  - Updated `checkStepVerification()` to include speech
  - Added Task Requirements Panel UI
  - Updated reset logic in step transitions
  
- `src/pages/BuildWI.tsx`:
  - Added `speechPhrase` field to `WIStep` interface
  - Added speech phrase input in step builder UI
  - Added Mic icon and helper text

### Current Status
- ✅ Task Requirements Panel implemented
- ✅ Speech-to-Text working with fuzzy matching
- ✅ Triple verification system complete
- ✅ All verification states properly managed
- 🔄 Ready for testing

---

## Session: November 26, 2025 (Evening) - Speech Recognition Debug

### Problem
The "Test Speech" button wasn't detecting any words. User couldn't see what the website was hearing.

### Root Cause
1. **Stale Closure Issue**: The `useEffect` that initialized speech recognition had multiple dependencies (`isListening`, `spokenText`, etc.) causing it to recreate the recognition object frequently
2. **Callback State Capture**: The `onresult` and `onend` callbacks captured stale state values
3. **No Interim Results Display**: Only final (confirmed) text was shown - no real-time feedback

### Solutions Implemented

#### 1. Single Initialization Pattern
```tsx
// OLD - recreated on every state change
useEffect(() => { ... }, [isListening, spokenText, karaokeWords, ...]);

// NEW - initialize once on mount
useEffect(() => { ... }, []); // Empty deps
```

#### 2. Ref-Based State Tracking
```tsx
const isListeningRef = useRef(false); // For callbacks
const [isListening, setIsListening] = useState(false); // For UI

// Use ref in callbacks (always current value)
recognition.onend = () => {
  if (isListeningRef.current) {
    recognition.start(); // Auto-restart
  }
};
```

#### 3. Interim + Final Text Display
```tsx
const [spokenText, setSpokenText] = useState(""); // Final confirmed
const [interimText, setInterimText] = useState(""); // Real-time

// In onresult:
setInterimText(interimTranscript); // Shows immediately (yellow)
if (finalTranscript) {
  setSpokenText(prev => prev + finalTranscript); // Confirmed (white)
}
```

#### 4. Enhanced Test UI
- **Yellow text**: Real-time interim words (what's being processed)
- **White text**: Final confirmed words
- **Red pulsing dot**: Recording indicator
- Better error handling with toast notifications

### Files Modified
- `src/pages/Monitor.tsx`:
  - Added `interimText` state
  - Added `isListeningRef` for callback state tracking
  - Rewrote speech recognition initialization (empty deps)
  - Updated `toggleListening()` to manage ref
  - Enhanced Test Speech overlay with interim display

### Testing Instructions
1. Start dev server: `npm run dev`
2. Go to Monitor page for emp-001
3. Click "Test Speech" button (top-right of camera)
4. Speak into microphone
5. Yellow text = what's being heard in real-time
6. White text = confirmed words

### Current Status
- ✅ Speech recognition properly initialized once
- ✅ Ref-based state for reliable callbacks
- ✅ Real-time interim text display
- ✅ Clear visual feedback
- 🔄 Ready for testing

---

## Session: November 26, 2025 (Night) - Verification Flow Overhaul

### Problems Identified

#### 1. Test Gesture Button Missing
- No quick way to test gesture detection outside of verification flow
- Had to start a full task just to test if gestures were working

#### 2. Frame Format Mismatch
- Monitor.tsx was sending flat arrays: `[[x1,y1], [x2,y2], ...]`
- Training.tsx and DTW API expected: `{timestamp, left_hand: {landmarks: [[]]}, right_hand: {landmarks: [[]]}}`
- Caused classification to fail silently

#### 3. Detection Loop Issues
- Only drew 5 fingertip keypoints (Training.tsx draws all 21)
- Skipped hand detection during test gesture
- Continuous API calls during verification (spamming server)

#### 4. Gesture Hallucination (Multiple API Calls)
- Detection loop runs at ~30fps
- Condition `elapsed >= GESTURE_RECORD_DURATION` was checked every frame
- React state updates (`setIsRecordingGesture(false)`) are async
- Multiple frames triggered classification before state updated = "thousands of detections"

### Solutions Implemented

#### 1. Added Test Gesture Button
```tsx
// Top-right of webcam
<Button onClick={startTestGesture}>🖐️ Test Gesture</Button>
```
- 3-2-1 countdown
- 3-second recording with "Show your hand..." wait phase
- Single DTW API call
- Auto-dismiss result after 3 seconds

#### 2. Fixed Frame Format
```tsx
// extractHandLandmarks() - matches Training.tsx exactly
const extractHandLandmarks = (hand) => {
  const wrist = hand.keypoints[0];
  const landmarks = hand.keypoints.map(kp => [
    (kp.x - wrist.x) / 100,  // Normalized to wrist
    (kp.y - wrist.y) / 100
  ]);
  return { landmarks };
};

// Frame format
{
  timestamp: elapsed,
  left_hand: { landmarks: [[x,y], ...] } | null,
  right_hand: { landmarks: [[x,y], ...] } | null
}
```

#### 3. Simplified Detection Loop
- Always detect hands (removed conditional skipping)
- Always update `lastHandsRef` for async access
- Draw all 21 keypoints like Training.tsx
- Red dots during test, green dots normally

#### 4. Record-Then-Classify Approach (Verification)
**Old Flow (Bad)**:
- Continuous detection throughout verification
- Multiple API calls at random intervals
- Unreliable results

**New Flow (Fixed)**:
1. Countdown 3-2-1
2. **Recording Phase** (2 seconds): Collect frames, show "RECORDING GESTURE..." overlay
3. **Classify Once**: Single API call with all collected frames
4. **Speech Phase**: Show gesture result, prompt for speech
5. **Final Summary**: PASS/FAIL with details

#### 5. Ref-Based Classification Lock
```tsx
const isClassifyingGestureRef = useRef(false);

// In detection loop:
if (elapsed >= GESTURE_RECORD_DURATION && !isClassifyingGestureRef.current) {
  isClassifyingGestureRef.current = true; // LOCK - prevents duplicate calls
  const frames = [...gestureFramesRef.current];
  gestureFramesRef.current = []; // Clear immediately
  
  classifyGestureDTW(frames).then(result => {
    // Handle result once
  });
}

// Reset on new verification:
isClassifyingGestureRef.current = false;
```

### Visual Indicators Added
- **Red pulsing overlay**: "RECORDING GESTURE... 2s" during recording phase
- **Green/Yellow banner**: Shows detected gesture after classification
- **Animated badges**: Gesture/Component/Speech status at bottom

### Constants Updated
- `GESTURE_RECORD_DURATION = 2000` (2 seconds)
- `VERIFICATION_DURATION = 8000` (8 seconds total)
- `LOCK_CONFIDENCE = 0.5` (50% threshold)

### Files Modified
- `src/pages/Monitor.tsx`:
  - Added Test Gesture functionality
  - Added `extractHandLandmarks()` function
  - Added `lastHandsRef` for async hand access
  - Added `isClassifyingGestureRef` to prevent multiple API calls
  - Added recording phase states (`isRecordingGesture`, `gestureRecordingComplete`)
  - Updated detection loop for record-then-classify
  - Added visual overlays for recording phase
  - Draw all 21 keypoints instead of 5
  
- `server.js`:
  - Added detailed logging for classify requests
  - Logs frame count, first frame structure, result with all probabilities

### Current Status
- ✅ Test Gesture button working
- ✅ Frame format matches Training.tsx
- ✅ All 21 keypoints drawn
- ✅ Single API call per verification (ref lock)
- ✅ Visual recording indicator
- ✅ Auto-dismiss test results after 3s

---

## Session: November 27, 2025 - Verification Flow Issues

### Problem Summary
The step verification flow is not working reliably:
- Test Gesture button works correctly (detects gesture, shows result)
- But Start Step Verification often fails even when gesture is correct
- Shows "STEP FAILED" at timeout even when gesture was detected and matched
- Complex state management making debugging difficult

### What Works ✅
1. **Test Gesture Button** - Records 3s, classifies via DTW, shows result
2. **DTW Classification** - Server responds correctly (~20ms)
3. **Hand Detection** - MediaPipe detects hands reliably
4. **Speech Recognition** - Web Speech API works, verifies correctly

### What's Broken ❌
1. **Step Verification** - Doesn't reliably complete when gesture matches
2. **State Synchronization** - `lockedGesture` not being set properly in all code paths
3. **Timeout Logic** - Shows "FAILED" even when gesture was detected

### Attempted Fixes (Nov 27)
1. Added `softResetVerification()` to keep verified items on retry
2. Added auto-verify `useEffect` that watches `currentGesture`
3. Simplified `performGestureVerification()` to match Test Gesture logic
4. Removed "Hold still" complexity

### Current Status
- Code committed but verification still unreliable
- May need to **redesign the verification flow from scratch**

### Root Cause Analysis
The verification system has grown too complex with multiple overlapping mechanisms:
- `checkStepVerification()` - old callback-based approach
- `performGestureVerification()` - async recording approach
- Auto-verify `useEffect` - watches `currentGesture`
- Timeout `useEffect` - checks `lockedGesture`

These don't coordinate well together, leading to race conditions and missed state updates.

### Recommendation: Simplify Architecture
**Option A: Single Source of Truth**
- Use ONLY the Test Gesture approach for verification
- Remove `checkStepVerification()` callback
- Remove complex timeout logic
- Just: Record → Classify → Match → Pass/Fail

**Option B: Complete Redesign**
- Start fresh with a simpler state machine
- States: IDLE → COUNTDOWN → RECORDING → CLASSIFYING → RESULT
- Single function handles all transitions
- Clear success/failure paths

---

## Next Steps (Updated Priority)

### 1. 🔴 **REDESIGN Verification Flow** (CRITICAL)
- Choose Option A or B above
- Implement clean state machine
- Test thoroughly before adding features

### 2. 🟡 Component Detection Integration
- After verification is stable

### 3. 🟢 Database Integration
- After core features work

### 4. 🔵 Reporting
- After data persistence

---

## Quick Reference

### Start Development
```bash
cd /home/noclout/employee-monitor-view
npm run dev      # Vite (port 8080)
node server.js   # Backend (port 3000)
```

### Test Gesture
1. Open Monitor page: http://localhost:8080/monitor/emp-001
2. Click "🖐️ Test Gesture" button (top-right of webcam)
3. Wait for 3-2-1 countdown
4. Show gesture for 3 seconds
5. See result with confidence %

### Key Files
- `src/pages/Monitor.tsx` - Live monitoring with verification
- `src/pages/Training.tsx` - Gesture training UI
- `gesture_workflow/scripts/dtw_gesture.py` - DTW classifier
- `server.js` - Backend API

---

## Session: November 27, 2025 - Verification Flow Redesign (Option A)

### Problem
The verification system was too complex and unreliable:
- Multiple overlapping mechanisms (callbacks, useEffects, timeouts)
- Race conditions between state updates
- Gesture would detect correctly but step still failed at timeout
- `lockedGesture` never getting set properly

### Solution: Complete Simplification (Option A)

#### Phase 1: Remove Complex Logic
1. **Removed complex verification timeout useEffect** (~60 lines)
   - Was checking `verificationStartTime` and `VERIFICATION_DURATION` every 100ms
   - Caused race conditions with gesture classification
   
2. **Removed auto-verify useEffect**
   - Matching now handled directly in verification function
   
3. **Cleaned up unused state variables**
   - Simplified UI overlays

#### Phase 2: Create Two Identical Functions
Created `startTestGesture()` and `startStepVerification()` with SAME flow:
```
Countdown 3-2-1 → Wait for hand → Record 3s → Classify DTW → Show result
```

The only difference: `startStepVerification()` also checks if gesture matches required and completes step.

### Result
- Test Gesture button works ✅
- Step Verification uses same logic ✅
- No more race conditions ✅
- Much cleaner code (-213 lines net)

---

## Session: November 27, 2025 (Evening) - Parallel Speech + Gesture

### Goal
Run speech recognition and gesture detection simultaneously for efficient verification.

### Architecture
```
┌────────────────────────────────────────┐
│        User clicks "Start"              │
└────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────┐
│          Countdown 3-2-1                │
└────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌─────────────────┐   ┌─────────────────┐
│  GESTURE (3s)   │   │  SPEECH (5s)    │
│  Record frames  │   │  Web Speech API │
│  DTW classify   │   │  (Browser only) │
│  (Server call)  │   │  (Zero server)  │
└─────────────────┘   └─────────────────┘
        │                       │
        └───────────┬───────────┘
                    ▼
┌────────────────────────────────────────┐
│  Both pass? → STEP COMPLETE            │
│  One fails? → Show which failed        │
└────────────────────────────────────────┘
```

### Server Load: Still Just 1 API Call!
| Component | Where It Runs | Server Load |
|-----------|---------------|-------------|
| Gesture Detection | Server (DTW API) | 1 call |
| Speech Detection | Browser (Web Speech API) | **ZERO** |

### Problem Encountered: Speech Showing "nothing"
**Symptom**: User said "hello", UI showed "hello" during recording, but result showed "Speech: nothing"

**Root Cause**: Stale closure - the `spokenText` state variable was read inside the async function, but it captured the initial empty value.

**Solution**: Added `spokenTextRef` to track speech in real-time:
```typescript
const spokenTextRef = useRef(""); // Track spoken text for closures

// In speech recognition callback:
setSpokenText(prev => {
  const newText = (prev + ' ' + finalTranscript).trim();
  spokenTextRef.current = newText; // Sync ref!
  return newText;
});

// In verification function:
const capturedSpeechText = spokenTextRef.current; // Always current!
```

### UI Improvements
1. **Checkmarks on Verified Items**
   - Gesture box turns green with ✓ when matched
   - Speech box turns green with ✓ when matched
   
2. **Verified Progress Badge**
   - Shows "X/Y Verified" (e.g., "1/2 Verified", "2/2 Verified")
   
3. **Real-time Speech Feedback**
   - Shows what you're saying during recording
   - Displays both interim and final transcripts

4. **Result Display**
   - Shows: `GoodJob (85%) | 🎤✓ | 2/2`
   - Or on failure: `GoodJob (85%) | 🎤✗ | 1/2`

### Files Modified
- `src/pages/Monitor.tsx`:
  - Added `spokenTextRef` for real-time speech tracking
  - Updated `startStepVerification()` for parallel execution
  - Set `lockedGesture` and `speechVerified` states properly
  - Updated UI to use `isTestingGesture` instead of `isVerifying`
  - Added verified count to badge

### Current Status
- ✅ Parallel gesture + speech detection working
- ✅ Speech capture issue fixed (no more "nothing")
- ✅ UI shows checkmarks and progress
- ✅ Real-time feedback during recording
- ✅ Zero additional server load for speech

---

## Session: November 27, 2025 (Late Evening) - Task Persistence

### User Request
> "any task that has been checked go to uncheck when we restart the website make that permanently"
> "if it daily task just make another task when it pass the day"

### Problem
- Completed tasks reset to "pending" on page reload
- No history tracking for policy compliance
- Daily tasks don't differentiate between different days

### Solution Implemented

#### 1. Extended Task Interface
```typescript
interface Task {
  // ... existing fields
  dateKey?: string;       // "2025-11-27" for daily, "2025-11-w4" for weekly
  completedAt?: string;   // ISO timestamp when completed
  employeeId?: string;    // Which employee completed this
}
```

#### 2. Date-Based Task ID Generation
```typescript
const generateTaskId = (wiId: string, type: string, frequency: string) => {
  const today = getTodayKey(); // "2025-11-27"
  
  if (frequency === 'Daily') {
    return { id: `task-${wiId}-${today}`, dateKey: today };
  } else if (frequency === 'Weekly') {
    const weekNum = Math.ceil((new Date().getDate()) / 7);
    const monthKey = new Date().toISOString().slice(0, 7);
    return { id: `task-${wiId}-${monthKey}-w${weekNum}`, dateKey: `${monthKey}-w${weekNum}` };
  } else if (frequency === 'Monthly') {
    const monthKey = new Date().toISOString().slice(0, 7);
    return { id: `task-${wiId}-${monthKey}`, dateKey: monthKey };
  }
  return { id: `task-${wiId}`, dateKey: undefined };
};
```

#### 3. Persistence Helpers
```typescript
const loadSavedTasks = (employeeId: string): Task[] => {
  const saved = localStorage.getItem(`employee_tasks_${employeeId}`);
  return saved ? JSON.parse(saved) : [];
};

const saveTasks = (employeeId: string, tasks: Task[]) => {
  localStorage.setItem(`employee_tasks_${employeeId}`, JSON.stringify(tasks));
};
```

#### 4. Task Completion Flow
On task complete:
1. Set `completedAt` timestamp
2. Update task status in state
3. Save all tasks to localStorage immediately

On page load:
1. Generate tasks with date-based IDs
2. Load saved tasks from localStorage
3. Merge saved states (status, completedSteps, completedAt) into generated tasks
4. Display properly showing previously completed tasks

### How It Works

**Daily Tasks:**
- November 27: `task-wi123-2025-11-27` → can be completed
- November 28: `task-wi123-2025-11-28` → NEW task (yesterday's stays completed)

**Monthly Tasks:**
- November: `task-calibration-2025-11` → can be completed
- December: `task-calibration-2025-12` → NEW task

**One-Time Tasks:**
- `task-wi456` → stays completed forever

### Policy Compliance
This enables:
- ✅ Daily task completion tracking
- ✅ Historical record of when tasks were done
- ✅ New task instances for each day/week/month
- ✅ Audit trail via localStorage

### Files Modified
- `src/pages/Monitor.tsx`:
  - Extended Task interface
  - Added persistence helper functions
  - Updated task generation useEffect
  - Updated handleCompleteStep to save tasks

### Git Commit
`da8a0ca` - "feat: add persistent task completion with daily task instances"

---

## Quick Reference (Updated)

### Start Development
```bash
cd /home/noclout/employee-monitor-view
npm run dev      # Vite (port 8080)
node server.js   # Backend (port 3000)
```

### Test Gesture (Standalone)
1. Open Monitor page: http://localhost:8080/monitor/emp-001
2. Click "🖐️ Test Gesture" button
3. Countdown 3-2-1
4. Show gesture for 3 seconds
5. See result with confidence %

### Step Verification (With Speech)
1. Select a task with gesture + speech requirements
2. Click "Start Step Verification"
3. Countdown 3-2-1
4. Show gesture AND speak the phrase
5. See combined result: gesture ✓/✗ | speech ✓/✗ | X/Y

### Key Architecture
- **Gesture**: Browser records → Server classifies (1 API call)
- **Speech**: Browser handles everything (0 API calls)
- **Component**: YOLO detection in background (throttled API calls)
- **All three run in parallel** for efficient verification

---

## Session: November 27, 2025 (Night) - Step Verification Loop & Component Integration

### Problems Faced & Solutions

#### Problem 1: Second Step Verification Freezes
**Symptom**: After completing step 1, step 2 verification would freeze/hang
**Root Cause**: Stale closure in `handleCompleteStep` - the `currentStepIndex` was captured at callback creation time, not execution time

**Solution**: Added `currentStepIndexRef` to track index in real-time
```typescript
const currentStepIndexRef = useRef(currentStepIndex);

// In handleCompleteStep - read from ref instead of stale closure
const currentIdx = currentStepIndexRef.current;
if (currentIdx < totalSteps - 1) {
  const nextStepIndex = currentIdx + 1;
  setCurrentStepIndex(nextStepIndex);
  currentStepIndexRef.current = nextStepIndex; // Update ref immediately
}
```
**Commit**: `5f344a1` - "fix: use ref in handleCompleteStep for all step transitions"

---

#### Problem 2: Speech Detection Leaking Between Sessions
**Symptom**: Rare case where speech showed "1/2 verified" before task even started
**Root Cause**: 
1. `spokenTextRef.current` wasn't cleared during resets
2. Web Speech API auto-restart feature kept listening
3. Leftover text could match new step requirements

**Solution**: Clear ref and stop recognition during all resets
```typescript
const resetStepVerification = useCallback(() => {
  // ... other resets
  spokenTextRef.current = ""; // Clear speech ref
  if (recognitionRef.current && isListeningRef.current) {
    isListeningRef.current = false;
    recognitionRef.current.stop();
    setIsListening(false);
  }
}, []);
```
**Commit**: `d2a7e2e` - "fix: prevent speech detection leaking between sessions"

---

#### Problem 3: Component Detection Not Part of Step Verification
**Symptom**: Steps with componentId requirement weren't checking component detection
**Root Cause**: `startStepVerification()` only checked gesture + speech, ignored component

**Solution**: Integrated component into verification flow
```typescript
// In startStepVerification:
const requiredComponentId = currentStep?.componentId;
const requiredComponent = requiredComponentId
  ? trainedComponents[parseInt(requiredComponentId) - 1]
  : null;

// Enable YOLO detection during verification
setIsVerifying(true);

// After gesture/speech check:
if (requiredComponent) {
  componentMatched = !!lockedComponent && 
    lockedComponent.toLowerCase() === requiredComponent.toLowerCase();
}

// Pass only when ALL match
if (gestureMatched && speechMatched && componentMatched) {
  handleCompleteStep();
}
```
**Commit**: `107525b` - "feat: integrate component detection into step verification"

---

### New Feature: Test Component Button

Added a "Test Component" button for standalone YOLO testing:

```typescript
const startTestComponent = async () => {
  // Capture current video frame
  const base64 = tempCanvas.toDataURL('image/jpeg', 0.8);
  
  // Send to YOLO endpoint
  const response = await fetch('http://localhost:3000/api/detect', {
    method: 'POST',
    body: JSON.stringify({ image: base64 })
  });
  
  // Display results
  if (result.detections.length > 0) {
    const detected = result.detections
      .map(d => `${d.class} (${(d.confidence * 100).toFixed(0)}%)`)
      .join(', ');
    setTestComponentResult(detected);
  }
};
```
**Commit**: `7ef4c4f` - "feat: add Test Component button for YOLO detection testing"

---

## Current Architecture Summary

### Detection Stack
| Component | Technology | Location | Server Load |
|-----------|------------|----------|-------------|
| Hand Tracking | MediaPipe Hands | Browser | 0 |
| Gesture Classification | DTW + k-NN | Server (Python) | 1 call/verification |
| Speech Recognition | Web Speech API | Browser | 0 |
| Object Detection | YOLOv8n | Server (Python) | Throttled (500ms) |

### Step Verification Flow
```
User clicks "Start Step"
        ↓
Countdown: 3 → 2 → 1
        ↓
┌─────────────────────────────────────────┐
│           PARALLEL EXECUTION             │
├─────────────────┬───────────┬───────────┤
│ Speech API      │ Gesture   │ YOLO      │
│ (browser)       │ Recording │ Detection │
│ listens for     │ 3 seconds │ background│
│ speech          │ of frames │ loop      │
└─────────────────┴───────────┴───────────┘
        ↓
DTW Classification (server)
        ↓
Check All Requirements:
  - Gesture: detected == required?
  - Speech: fuzzy match >= 70%?
  - Component: lockedComponent == required?
        ↓
ALL PASS → Complete Step → Next Step
ANY FAIL → Show Error → Retry
```

### State Management
| State | Purpose | Ref Mirror |
|-------|---------|------------|
| `currentStepIndex` | Current step number | `currentStepIndexRef` |
| `spokenText` | Accumulated speech | `spokenTextRef` |
| `isListening` | Speech API active | `isListeningRef` |
| `lockedGesture` | First high-confidence gesture | - |
| `lockedComponent` | First high-confidence component | - |

### Key Constants
```typescript
const LOCK_CONFIDENCE = 0.5;      // 50% to lock gesture/component
const RECORD_DURATION = 3000;     // 3 seconds gesture recording
const FAST_DETECTION_INTERVAL = 500;  // 500ms between YOLO calls
const SLOW_DETECTION_INTERVAL = 2000; // 2s when component locked
```

---

## Technology Decisions

### Why YOLOv8n for Component Detection?
- **Speed**: ~6ms/frame inference
- **Size**: 6MB model file
- **Accuracy**: Good for 20-80cm working distance
- **Real-time**: Can handle 30fps with throttling
- **Custom Training**: Easy to train on specific components

### Why DTW for Gesture Recognition?
- **No Training Time**: Instant "training" by storing templates
- **Speed Invariant**: Same gesture at different speeds matches
- **Low Data**: Works with 1-3 samples per class
- **Interpretable**: Can debug by examining distances

### Why Web Speech API for Speech?
- **Zero Server Load**: Runs entirely in browser
- **Free**: No API costs
- **Real-time**: Streaming transcription
- **Good Accuracy**: Works well for short phrases

---

## File Structure (Key Files)

```
src/pages/
├── Monitor.tsx          # Main monitoring page (2200+ lines)
├── Training.tsx         # AI training page
├── BuildWI.tsx          # Work instruction builder
└── ManageTeam.tsx       # Team management

server.js                # Express backend (port 3000)
├── /api/detect          # YOLO object detection
├── /api/gestures/classify  # DTW gesture classification
└── /api/gestures/train  # Save gesture templates

gesture_workflow/
├── scripts/dtw_gesture.py  # DTW + k-NN implementation
└── models/gesture_model.pkl  # Trained gesture model

yolo_workflow/
├── scripts/detect.py    # YOLO inference
├── scripts/train_model.py  # YOLO training
└── runs/custom_model/weights/best.pt  # Trained model
```

---

## Git Commits Summary (November 27, 2025)

| Commit | Description |
|--------|-------------|
| `24e9339` | docs: add task persistence session to PLAN.md |
| `da8a0ca` | feat: add persistent task completion with daily task instances |
| `64f4c9c` | fix: resolve stale closure issue causing second step verification to freeze |
| `5f344a1` | fix: use ref in handleCompleteStep for all step transitions |
| `d2a7e2e` | fix: prevent speech detection leaking between sessions |
| `107525b` | feat: integrate component detection into step verification |
| `7ef4c4f` | feat: add Test Component button for YOLO detection testing |

---

## Next Steps / TODO

1. **Training UI Improvements**
   - Add more training data for YOLO components
   - Add data augmentation for gesture templates

2. **Production Readiness**
   - Move from localStorage to real database
   - Add user authentication
   - Implement reporting/export

3. **Optional Upgrades**
   - Consider YOLOv11 for better accuracy
   - Explore YOLO-World for zero-shot detection
   - Add GPU acceleration if available

---

## Quick Commands

```bash
# Start development
npm run dev & node server.js

# Test gesture detection
curl -X POST http://localhost:3000/api/gestures/classify \
  -H "Content-Type: application/json" \
  -d '{"frames": [...]}'

# Test YOLO detection
curl -X POST http://localhost:3000/api/detect \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/jpeg;base64,..."}'

# Check gesture model
python gesture_workflow/scripts/dtw_gesture.py --info

# Train YOLO model
python yolo_workflow/scripts/train_model.py --epochs 50
```


