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
