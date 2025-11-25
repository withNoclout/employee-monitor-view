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
