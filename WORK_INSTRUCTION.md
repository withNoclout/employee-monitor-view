# Work Instruction – Component Assembly Log Site

## 1. Overview & Relationship to Other Systems
- **Primary Site**: `employee-monitor-view` – a dashboard that monitors employee activities, tasks, and component assembly logs.
- **Related Site(s)**:
  - **Backend API Server** (`server.js` in this repo) – provides endpoints for dataset handling, YOLO model training, gesture detection, and the **log service**.
  - **Data Sources**:
    - **YOLO Workflow** – supplies image/label data for object detection; logs may reference model versions used during verification.
    - **Gesture Workflow** – provides hand‑pose detection results that are stored as part of verification steps.
    - **External Repositories** – source code links (e.g., GitHub) are stored in log details for traceability.
- **What We Collect**:
  - Timestamped log entries for component assembly actions (create, modify, delete).
  - User information (who performed the action).
  - Component metadata (type, ID, status, severity).
  - Optional payloads: code diffs, assembly steps, links to source files.

## 2. Backend Responsibilities
- **Express Server (`server.js`)**
  - Hosts REST endpoints (`/api/logs`, `/api/save-dataset`, etc.).
  - **Log Service (`src/server/logService.ts`)** – appends JSON‑Lines to hierarchical paths (Task/Component/Part/Date).
  - Handles file uploads for YOLO datasets and runs Python scripts.
- **Log Persistence**
  - Currently file‑based (fast append). Can be swapped for a DB (PostgreSQL/MongoDB) by replacing `logService` implementation.
- **Security / Auth** (future): protect log endpoints, validate user identity.

## 3. Front‑end Responsibilities
- **React + Vite** UI
  - **Dashboard (`Index.tsx`)** – shows employee cards, performance chart, activity timeline.
  - **Component Assembly Log Page (`ViewLog.tsx`)** – UI for filtering, viewing, and drilling into log entries.
  - **Hooks** – `useActivityLog` abstracts log creation; now posts to `/api/logs` and updates local UI state.
- **Routing** – `react-router-dom` routes defined in `src/App.tsx`; new route `/view-log` added.
- **Styling** – dark theme, glass‑morphism, gradient accents, micro‑animations for premium look.

## 4. Purpose of This Site
- Provide **real‑time visibility** into employee‑performed tasks and component assembly actions.
- Enable **traceability**: when a component shows an error, developers can quickly see who assembled it, what steps were taken, and view code diffs.
- Serve as a **central hub** for monitoring YOLO and gesture verification workflows alongside employee activities.

## 5. Adding a New Module / Feature
When extending the system, follow these steps:
1. **Identify Scope** – Determine whether the feature is a **frontend UI component**, a **backend endpoint**, or both.
2. **Backend**
   - Add a new route in `server.js` (or a dedicated router file).
   - If persisting data, decide between **file‑based** (quick prototype) or **database** (for large scale). Update `logService.ts` or create a new service.
   - Write unit tests for the endpoint.
3. **Frontend**
   - Create a new page/component under `src/pages/` or `src/components/`.
   - Follow the existing design system: dark theme, glass‑morphism cards, gradient buttons, and micro‑animations.
   - Use existing hooks (`useActivityLog`, `useQuery`) for data fetching.
   - Add a **route** in `src/App.tsx` before the catch‑all.
   - If navigation is needed from existing pages, add a **Link/Button** (import from `react-router-dom` and `@/components/ui/button`).
4. **Documentation**
   - Update this **Work Instruction** file with a short description of the new module, its responsibilities, and any new dependencies.
   - Add comments in code where integration points occur.
5. **Testing & Deployment**
   - Run `npm run dev` and verify UI + API.
   - Commit changes with a clear message (`feat: add <module>`) and push to `dev`.
   - Ensure CI (if any) passes.

## 6. Quick Reference Checklist for New Modules
- [ ] Determine **frontend vs backend** responsibilities.
- [ ] Add **type definitions** (e.g., new log entry fields) in `src/hooks/useActivityLog.ts`.
- [ ] Create **UI components** using existing design tokens.
- [ ] Register **routes** in `src/App.tsx`.
- [ ] Implement **API endpoints** (or extend `logService`).
- [ ] Write **unit/integration tests**.
- [ ] Update **WORK_INSTRUCTION.md** with module overview.
- [ ] Commit & push to `dev`.

---
*Keep this file up‑to‑date as the project evolves. It serves as the single source of truth for developers onboarding or extending the Component Assembly Log site.*
