# Development Journey Log

## Objective: Real User Integration & Accurate Task Tracking

**Goal**: Ensure "Test User1" (emp-001) is treated as a real user with persistent data, accurate task timing, and full integration across the Dashboard, Monitor, and Manage Team views.

### Challenges & Solutions

#### 1. Data Inconsistency (Dashboard vs. Monitor)
*   **Issue**: The Dashboard showed "Test User1" (from server mock data), but the Monitor view showed hardcoded "test test" data.
*   **Fix**:
    *   Removed hardcoded data in `Monitor.tsx`.
    *   Implemented fetching from `/api/employees` to get the real server-side user object.
    *   Ensured `server.js` initializes `realUser` (emp-001) with persistent state, separate from the simulation loop.

#### 2. Task Synchronization
*   **Issue**: Completing a task in `Monitor.tsx` updated the local state but didn't reflect on the server or Dashboard.
*   **Fix**:
    *   Created a new API endpoint `POST /api/employees/:id/update` in `server.js`.
    *   Implemented `syncTasksToServer` in `Monitor.tsx` to push updates immediately upon task completion.

#### 3. Accurate Hours Calculation
*   **Issue**: "Hours Worked" was showing 0 or inaccurate values.
*   **Fix**:
    *   **Server**: Added `calculateHoursWorked` helper. It now calculates hours based on the difference between `started_at` and `completed_at`.
    *   **Monitor**: Updated `handleStartTask` to record `started_at` (precise start time) and `handleCompleteStep` to record `completed_at`.
    *   **Manage Team**: Updated task creation to include `assigned_at` as a fallback.

#### 4. Manage Team Integration
*   **Issue**: The "Manage Team" page used a hardcoded list of fake employees and didn't allow assigning tasks to the real user.
*   **Fix**:
    *   Updated `ManageTeam.tsx` to fetch the full employee list from the server.
    *   Implemented "Save" functionality for task assignment.
    *   **Logic**: When "Save" is clicked, it iterates through all team members, fetches their current data, appends the new task, and syncs it back to the server.

#### 5. Multi-Team Membership
*   **Issue**: Users were restricted to a single team.
*   **Fix**: Removed the logic in `ManageTeam.tsx` that automatically removed a user from other teams when adding them to a new one.

#### 6. Task Count Display (0/0 Bug)
*   **Issue**: Dashboard showed "0/0" tasks even when tasks were pending.
*   **Fix**:
    *   Identified a case-sensitivity mismatch: Server expected `'COMPLETED'`, Frontend sent `'completed'`.
    *   Updated `server.js` to accept both uppercase and lowercase status strings for accurate counting.

#### 7. Department Search Integration
*   **Issue**: Users needed a way to search for employees within a specific department view.
*   **Fix**:
    *   Added `SearchBar` to the header of `EmployeeDetailView.tsx`.
    *   Connected it to the main search logic in `Index.tsx` via `onSelectEmployee` prop.
    *   This allows users to filter and select employees specifically within the department they are viewing.

### Summary of Key Changes
- **`server.js`**: Added persistence for `realUser`, new update endpoint, and robust hours/task counting logic.
- **`Monitor.tsx`**: Connected to real data, added precise timing (`started_at`), and real-time server syncing.
- **`ManageTeam.tsx`**: Connected to real data, added multi-team support, and implemented bulk task assignment via API.
- **`EmployeeDetailView.tsx`**: Added department-scoped search functionality.

---
*Last Updated: 2025-12-01 (Search Feature Added)*
