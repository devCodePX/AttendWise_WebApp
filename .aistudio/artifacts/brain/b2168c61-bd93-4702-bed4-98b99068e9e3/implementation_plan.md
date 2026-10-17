# AttendWise — College Attendance Tracker & Bunk Planner Architecture Plan (Revised)

AttendWise is a responsive web application designed for college students to track attendance across semesters, monitor subject-specific attendance thresholds (default 75%), prevent attendance shortages with exact mathematical recovery formulas, accurately account for cancelled/not-held classes, and simulate future attendance outcomes with a What-If Bunk Planner.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The plan has been revised with the following mandatory architectural specifications:
> - **Frontend Stack**: Pure **React with JavaScript** (`.jsx` for components, `.js` for utility modules) and **Standard CSS** (`.css` files with native CSS Custom Properties for theming). Strictly zero TypeScript (`.ts`/`.tsx`) and zero CSS utility frameworks (no Tailwind CSS, no Bootstrap).
> - **Class Status Taxonomy & Cancelled Class Handling**: Three distinct attendance statuses: `PRESENT`, `ABSENT`, and `CANCELLED`. A cancelled class (professor on leave, official college holiday, or unscheduled cancellation) is **strictly excluded** from the total held classes denominator ($T$), preventing unfair penalty. In contrast, an intentional or unintentional student absence ("bunk") remains an `ABSENT` record that counts toward $T$.
> - **Zero-Held Classes State**: If all records for a subject are `CANCELLED` or no classes have been logged yet ($T = 0$), the application explicitly displays `"No classes held yet"` rather than an erroneous or misleading percentage.
> - **Database & Auth Integration**: Supabase PostgreSQL with Row Level Security (RLS) for authenticated users (Google OAuth and Email/Password), accompanied by an instant **Demo Mode** with LocalStorage persistence for immediate zero-config testing.
> - **Companion Innovation**: An interactive **What-If Attendance Goal Simulator & Bunk Planner** providing real-time projections.

---

## 1. Overview & Core Concept

College students are required to maintain a mandatory attendance threshold (typically 75% or 80%) across 5–6 courses per semester. Debarment rules strictly evaluate attendance against **classes actually held**.

Common student pain points addressed by AttendWise:
1. **The Cancelled Class Dilemma**: In conventional trackers, students often log cancelled lectures as "absent" or "present" because there is no third option, corrupting their actual university attendance records. AttendWise introduces first-class `CANCELLED` tracking.
2. **Bunk vs. Cancellation Boundary**: A clear distinction in the UI ensures that when a student decides to skip a lecture, it is registered as `ABSENT`. When a teacher does not conduct a lecture, it is registered as `CANCELLED`.
3. **Recovery & Bunk Calculations**: Exact integer math indicating how many future sessions a student can safely miss before dropping below threshold, or how many consecutive held sessions they must attend to restore eligibility.
4. **Weighted Semester Aggregate**: Total attended classes across all subjects divided by total held classes across all subjects ($\sum A / \sum T$).

---

## 2. Attendance Status Taxonomy & Calculation Engine

### The Three Status Classifications

| Status | Meaning & Criteria | Impact on Attended Count ($A$) | Impact on Total Held Classes ($T$) | Included in Attendance %? |
| :--- | :--- | :---: | :---: | :---: |
| `PRESENT` | Class took place and the student attended. | **+1** | **+1** | **Yes** (Numerator & Denominator) |
| `ABSENT` | Class took place and the student did not attend (including skips, bunks, or personal illness). | **0** | **+1** | **Yes** (Denominator only) |
| `CANCELLED` | Class was not held by the college/faculty (holiday, teacher absence, institute event). | **0** | **0** | **No** (Excluded entirely) |

### Preventing Misuse (Bunks vs. Cancellations)
- In the attendance logging UI, the three actions are cleanly distinguished:
  - **Present** (Green button): Student attended the session.
  - **Absent / Bunked** (Rose button): Class was held, student was not present.
  - **Class Cancelled** (Slate/Gray button): Class was officially not held or cancelled by instructor.
- A quick helper note informs the student: *"Mark Cancelled only if the lecture was not conducted by the college. Bunking an active lecture must be logged as Absent."*
- Inline editing allows students to toggle or correct any record if a class status was logged mistakenly.

### Mathematical Formulas

For each subject:
- $A = \text{Count of records with } \text{status} = \text{'PRESENT'}$
- $T = \text{Count of records with } \text{status} \in (\text{'PRESENT'}, \text{'ABSENT'})$
- $C = \text{Count of records with } \text{status} = \text{'CANCELLED'}$ *(tracked for audit, excluded from $T$)*
- $R = \text{Required attendance threshold percentage (e.g. } 75.0\text{)}$

#### 1. Subject Attendance Percentage
$$\text{Percentage} = \begin{cases} \frac{A}{T} \times 100 & \text{if } T > 0 \\ \text{null / "No classes held yet"} & \text{if } T = 0 \end{cases}$$
*(When $T = 0$, even if $C > 0$, the app explicitly outputs "No classes held yet" without NaN or division by zero).*

#### 2. Maximum Additional Classes Allowed to Miss (Bunk Quota)
Valid when student is eligible ($\frac{A}{T} \ge \frac{R}{100}$):
$$\text{Allowable Absences} = \max\left(0, \left\lfloor \frac{100 \times A}{R} - T \right\rfloor\right)$$

#### 3. Minimum Consecutive Classes Needed to Recover
Valid when student is below threshold ($\frac{A}{T} < \frac{R}{100}$):
$$\text{Required Present Classes} = \begin{cases} \left\lceil \frac{R \times T - 100 \times A}{100 - R} \right\rceil & \text{if } R < 100 \\ \infty \text{ (Finite recovery impossible)} & \text{if } R = 100 \text{ and } A < T \\ 0 & \text{if } \frac{A}{T} \ge \frac{R}{100} \end{cases}$$

#### 4. Overall Semester Weighted Attendance
$$\text{Overall Percentage} = \begin{cases} \frac{\sum_{i=1}^{N} A_i}{\sum_{i=1}^{N} T_i} \times 100 & \text{if } \sum T_i > 0 \\ \text{null / "No classes held yet"} & \text{if } \sum T_i = 0 \end{cases}$$

---

## 3. Calculation Test Cases & Validations

| Test Scenario | Present ($A$) | Absent | Cancelled ($C$) | Total Held ($T$) | Threshold ($R$) | Calculated % | Bunk Quota | Recovery Needed | Expected Outcome |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Case 1: Standard Base** | 30 | 10 | 0 | 40 | 75% | $75.0\%$ | 0 | 0 | Exactly at 75%; 0 allowable absences. |
| **Case 2: With Cancellations** | 30 | 10 | 2 | 40 | 75% | $75.0\%$ | 0 | 0 | Cancelled classes do not change denominator ($T = 40$). Still 75.0%. |
| **Case 3: Shortage Recovery** | 27 | 13 | 3 | 40 | 75% | $67.5\%$ | 0 | 12 | $T = 40$ held. $\lceil \frac{75(40) - 100(27)}{25} \rceil = \lceil \frac{300}{25} \rceil = 12$ consecutive classes. |
| **Case 4: High Attendance** | 36 | 4 | 2 | 40 | 80% | $90.0\%$ | 5 | 0 | $T = 40$ held. $\lfloor \frac{3600}{80} - 40 \rfloor = 5$ additional absences allowed. |
| **Case 5: Only Cancelled** | 0 | 0 | 4 | 0 | 75% | `null` | 0 | 0 | 0 held classes. Clean empty state: *"No classes held yet"*. No division by zero. |
| **Case 6: Toggle ABSENT $\rightarrow$ CANCELLED** | 29 | $11 \rightarrow 10$ | $0 \rightarrow 1$ | $40 \rightarrow 39$ | 75% | $72.5\% \rightarrow 74.36\%$ | Immediate update | Immediate recalculation | Removing false absence immediately boosts percentage and reduces recovery count. |
| **Case 7: Toggle CANCELLED $\rightarrow$ ABSENT** | 30 | $10 \rightarrow 11$ | $2 \rightarrow 1$ | $40 \rightarrow 41$ | 75% | $75.0\% \rightarrow 73.17\%$ | Immediate update | Immediate recalculation | Correctly recognizes held class that was missed; recalculates $T = 41$. |

---

## 4. Visual Design & Standard CSS Architecture

### Theme Variables (`src/index.css`)

Using pure CSS variables (no Tailwind, no preprocessor):

```css
:root {
  /* Brand & Core Accents */
  --color-primary: #4338ca;
  --color-primary-hover: #3730a3;
  --color-primary-light: #eef2ff;

  /* Semantic Status Colors */
  --color-safe: #059669;
  --color-safe-bg: #ecfdf5;
  --color-safe-border: #a7f3d0;

  --color-caution: #d97706;
  --color-caution-bg: #fffbeb;
  --color-caution-border: #fde68a;

  --color-shortage: #e11d48;
  --color-shortage-bg: #fff1f2;
  --color-shortage-border: #fecdd3;

  --color-cancelled: #64748b;
  --color-cancelled-bg: #f1f5f9;
  --color-cancelled-border: #cbd5e1;

  /* Neutrals & Surfaces */
  --bg-app: #f8fafc;
  --bg-surface: #ffffff;
  --bg-card: #ffffff;
  --border-subtle: #e2e8f0;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --text-light: #94a3b8;

  /* Typography & Layout */
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
}
```

### Visual Components & Styling Discipline
- **Zero Frameworks**: Clean, modular standard CSS files paired with components (`Navbar.css`, `SubjectCard.css`, `OverallStats.css`, `WhatIfSimulator.css`, `AttendanceHistory.css`).
- **Responsive Flexbox & CSS Grid**: High-density desktop layouts (`1200px` max-width container, 2-column or 3-column subject card grids) fluidly scaling to single-column mobile viewports.
- **Tabular Figures**: Numeric statistics, counts, and percentages explicitly styled with `font-variant-numeric: tabular-nums; font-family: var(--font-mono);` to prevent layout shift.
- **Status Indicators**:
  - Safe ($\ge R\%$): Emerald text with soft green accent.
  - Caution ($R\% \le \text{Current} < R\% + 5\%$): Amber warning badge.
  - Shortage ($< R\%$): Rose alert badge.
  - Cancelled badge: Clean slate gray tag indicating omitted from denominator.

---

## 5. Technical Architecture & Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AttendWise Client (React + JS)                     │
│                                                                             │
│  ┌────────────────────┐   ┌─────────────────────┐   ┌────────────────────┐  │
│  │     App.jsx        │   │  calculations.js    │   │     storage.js     │  │
│  │ (State & Modals)   │   │  (Pure Math Engine) │   │ (Demo Persistence) │  │
│  └─────────┬──────────┘   └──────────┬──────────┘   └──────────┬─────────┘  │
│            │                         │                         │            │
│            ▼                         ▼                         ▼            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                  Supabase Adapter / Client (supabase.js)              │  │
│  │      - Google OAuth & Email/Password Sign-In                          │  │
│  │      - Queries filtered by user_id with PostgreSQL RLS                │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
                      ┌────────────────┴────────────────┐
                      │                                 │
                      ▼                                 ▼
           [Supabase Cloud Backend]           [Demo Local Storage]
           - Semesters Table                  - Browser LocalStorage
           - Subjects Table                   - Instant Offline Testing
           - Attendance Records Table         - Sample Semesters & Courses
           - RLS Policies & Auth
```

### Component Hierarchy (`.jsx` + `.css`)

```
App.jsx (Root State: activeSemester, subjects, attendanceRecords, authUser, isDemoMode)
├── Navbar.jsx (App wordmark, active semester pill, auth buttons, demo indicator)
├── TabNavigation.jsx (Dashboard, Subjects, What-If Simulator, History)
├── OverallStats.jsx (Weighted % gauge, Total held classes, Total attended, Total cancelled, Risk count)
├── QuickBatchBar.jsx (One-tap logging for today: Mark all Present / Quick cycle)
├── SubjectGrid.jsx
│   └── SubjectCard.jsx (Current %, Status badge, Attended/Held counts, Bunk quota / Recovery alert, Action buttons: Present, Absent, Cancelled, View History)
├── Modals:
│   ├── MarkAttendanceModal.jsx (Date picker, status selector: PRESENT / ABSENT / CANCELLED, notes)
│   ├── AttendanceHistoryModal.jsx (Chronological list, status filter, inline status toggle, delete)
│   ├── WhatIfSimulatorModal.jsx (Projection slider: simulate next N classes, see prospective %)
│   ├── SemesterManagerModal.jsx (Create new semester, rename, delete, switch active)
│   ├── SubjectFormModal.jsx (Add / edit course name, course code, threshold %)
│   ├── AuthModal.jsx (Continue with Google, Email/Password login & signup)
│   ├── SupabaseConfigModal.jsx (Configure Supabase URL / Anon Key, view SQL schema)
│   └── ConfirmDialog.jsx (Accessible confirmation dialog for deleting records)
```

---

## 6. PostgreSQL Database Schema & Security (RLS)

### Schema with Cancelled Status Constraint

```sql
-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Semesters Table
CREATE TABLE public.semesters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT semester_name_not_empty CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX idx_semesters_user_id ON public.semesters(user_id);

-- 3. Subjects Table
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    required_percentage NUMERIC(5,2) NOT NULL DEFAULT 75.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subject_name_not_empty CHECK (char_length(trim(name)) > 0),
    CONSTRAINT required_percentage_range CHECK (required_percentage > 0 AND required_percentage <= 100)
);

CREATE INDEX idx_subjects_user_id ON public.subjects(user_id);
CREATE INDEX idx_subjects_semester_id ON public.subjects(semester_id);

-- 4. Attendance Records Table (Updated with CANCELLED status)
CREATE TABLE public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_subject_class_date UNIQUE (subject_id, class_date)
);

CREATE INDEX idx_attendance_user_id ON public.attendance_records(user_id);
CREATE INDEX idx_attendance_subject_date ON public.attendance_records(subject_id, class_date);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Semesters Policy
CREATE POLICY "Users can manage own semesters"
ON public.semesters FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Subjects Policy (Verifying user_id and semester ownership)
CREATE POLICY "Users can manage own subjects"
ON public.subjects FOR ALL TO authenticated
USING (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.semesters s WHERE s.id = subjects.semester_id AND s.user_id = auth.uid())
)
WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.semesters s WHERE s.id = subjects.semester_id AND s.user_id = auth.uid())
);

-- Attendance Records Policy (Verifying user_id and subject ownership)
CREATE POLICY "Users can manage own attendance records"
ON public.attendance_records FOR ALL TO authenticated
USING (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.subjects sub WHERE sub.id = attendance_records.subject_id AND sub.user_id = auth.uid())
)
WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.subjects sub WHERE sub.id = attendance_records.subject_id AND sub.user_id = auth.uid())
);
```

---

## 7. Revised Project Folder Structure (JavaScript & Regular CSS)

```
/
├── index.html                     # HTML5 entry point with Google Fonts & Meta tags
├── metadata.json                  # AI Studio applet metadata
├── package.json                   # Dependencies (@supabase/supabase-js, lucide-react)
├── vite.config.js                 # Standard Vite configuration with React plugin
├── src/
│   ├── main.jsx                   # React 19 entry point
│   ├── App.jsx                    # Root state coordinator & view switcher
│   ├── index.css                  # Global CSS variables, reset, typography, utilities
│   ├── App.css                    # App layout, container shells, grid styles
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Navbar.css
│   │   │   ├── TabNavigation.jsx
│   │   │   └── TabNavigation.css
│   │   ├── dashboard/
│   │   │   ├── OverallStats.jsx
│   │   │   ├── OverallStats.css
│   │   │   ├── SubjectCard.jsx
│   │   │   ├── SubjectCard.css
│   │   │   ├── SubjectGrid.jsx
│   │   │   └── SubjectGrid.css
│   │   ├── attendance/
│   │   │   ├── MarkAttendanceModal.jsx
│   │   │   ├── MarkAttendanceModal.css
│   │   │   ├── AttendanceHistoryModal.jsx
│   │   │   ├── AttendanceHistoryModal.css
│   │   │   ├── QuickBatchBar.jsx
│   │   │   └── QuickBatchBar.css
│   │   ├── simulator/
│   │   │   ├── WhatIfSimulatorModal.jsx
│   │   │   └── WhatIfSimulatorModal.css
│   │   ├── semester/
│   │   │   ├── SemesterManagerModal.jsx
│   │   │   ├── SemesterManagerModal.css
│   │   │   ├── SubjectFormModal.jsx
│   │   │   └── SubjectFormModal.css
│   │   ├── auth/
│   │   │   ├── AuthModal.jsx
│   │   │   ├── AuthModal.css
│   │   │   ├── SupabaseConfigModal.jsx
│   │   │   └── SupabaseConfigModal.css
│   │   └── common/
│   │       ├── ConfirmDialog.jsx
│   │       ├── ConfirmDialog.css
│   │       ├── StatusBadge.jsx
│   │       └── StatusBadge.css
│   └── lib/
│       ├── calculations.js        # Pure attendance formulas & What-If simulator math
│       ├── calculations.test.js   # Automated unit test suite verifying formulas
│       ├── supabase.js            # Supabase JS client and auth listener
│       └── storage.js             # Demo mode localStorage repository with sample data
```

---

## 8. Implementation Roadmap (Phased Execution)

### Phase 1: Pure JavaScript Math Engine & Automated Verification
- Create `src/lib/calculations.js` with functions:
  - `calculateSubjectStats(records, requiredPercentage)`: counts `PRESENT`, `ABSENT`, `CANCELLED`; computes held classes $T = \text{present} + \text{absent}$; returns percentage, allowable absences, and recovery classes.
  - `calculateOverallStats(subjects, allRecords)`: computes weighted aggregate $\sum A / \sum T$.
  - `simulateFutureAttendance(currentPresent, currentHeld, requiredPercentage, futurePresent, futureAbsent)`: returns projected percentage and status.
- Create automated verification test script `src/lib/calculations.test.js` covering all 7 test cases.

### Phase 2: Design System & Global Styles
- Configure `src/index.css` and `src/App.css` with CSS custom variables, typography scales, container grids, responsive breakpoints, and modal overlays.
- Build reusable UI building blocks in plain CSS: `StatusBadge.jsx`, `ConfirmDialog.jsx`.

### Phase 3: Dual Storage & Authentication Adapter
- Implement `src/lib/storage.js` with rich initial college mock data (5 subjects: Data Structures, Operating Systems, Database Systems, Computer Networks, Software Engineering) with pre-populated present, absent, and cancelled records.
- Implement `src/lib/supabase.js` with client initialization, session restoration, Google OAuth redirection, and error handler.
- Build `AuthModal.jsx` and `SupabaseConfigModal.jsx` (with copy-paste SQL schema script).

### Phase 4: Core Attendance & Cancelled Class Workflow
- Build `SubjectCard.jsx` displaying:
  - Attendance percentage badge (`Safe` $\ge R\%$, `Caution` within 5%, `Shortage` $< R\%$, or `No classes held yet`).
  - Direct 3-way action controls: `Present` (+1 A, +1 T), `Absent` (+1 T), `Cancelled` (+1 C, excluded from T).
  - Clear recommendation: *"You can safely miss X classes"* or *"Attend Y consecutive classes to regain 75%"*.
- Build `AttendanceHistoryModal.jsx` allowing students to review each dated entry, toggle between `PRESENT`, `ABSENT`, and `CANCELLED`, or delete accidental records.

### Phase 5: Dashboard Analytics & What-If Bunk Planner
- Build `OverallStats.jsx` showing the weighted overall percentage, total held vs. cancelled classes, and subjects at risk.
- Build `QuickBatchBar.jsx` for recording attendance across all subjects for a date.
- Build `WhatIfSimulatorModal.jsx` featuring an interactive slider (1–20 classes) and toggle ("I will attend" vs "I will skip") with instant live percentage projections.

### Phase 6: Semester & Subject CRUD Management
- Build `SemesterManagerModal.jsx` to create, rename, delete, and switch active semesters.
- Build `SubjectFormModal.jsx` to create and edit subjects with custom attendance threshold percentages.

### Phase 7: Verification & Build Validation
- Run unit test validations in `calculations.test.js`.
- Verify responsive layout on mobile (375px) and desktop (1440px).
- Execute `compile_applet` to ensure zero compilation or syntax errors.
