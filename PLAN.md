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
